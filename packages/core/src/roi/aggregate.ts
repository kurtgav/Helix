// ROI aggregation — the testable heart of the LIVE ROI engine. Given plain
// rows of persisted eligibility checks (already org-scoped by the caller) plus a
// drafted-LOA count, it produces the RoiSnapshot the dashboard renders. This is
// where "we sell ROI, not AI" becomes a number derived from REAL activity rather
// than a seeded constant.
//
// Deliberately PURE: no I/O, no clock, no mutation, fully deterministic — the
// same inputs always yield the same snapshot. All persistence lives in the thin
// @helix/db wrapper (packages/db/src/roi.ts) so every economic decision is
// unit-testable here without a database. Mirrors the event-sourced computeRoi in
// ./metrics, but consumes persisted rows instead of a metric event stream.

import type { Gap, OrgId, RoiSnapshot } from "@helix/shared";
import type { RoiWindow } from "../metrics";
import {
  DEFAULT_VERIFY_MS,
  LOA_DRAFT_HOURS,
  MANUAL_BASELINE_HOURS,
  estimateClaimValue,
  isDenialPrevented,
} from "./estimate";

/**
 * One persisted eligibility check, flattened to just what ROI needs. `gaps`
 * drives denial-prevention detection; `serviceCode` values a prevented denial;
 * `checkedAt` (ISO) windows the row. `durationMs` is optional because check
 * latency is not persisted yet — the aggregator substitutes {@link
 * DEFAULT_VERIFY_MS} when it is absent (see packages/db/src/roi.ts).
 */
export interface RoiCheckRow {
  serviceCode: string;
  gaps: readonly Gap[];
  checkedAt: string; // ISO timestamp
  durationMs?: number;
}

/**
 * Everything the aggregator needs for one org. `checks` are assumed already
 * scoped to `orgId` by the caller (the DB query filters by org); rows carry no
 * org of their own, so no per-row org filtering happens here. `loaDraftedCount`
 * is the count of drafted LOAs to credit with saved drafting time.
 */
export interface RoiAggregateInput {
  orgId: OrgId;
  checks: readonly RoiCheckRow[];
  loaDraftedCount: number;
}

/**
 * Inclusive window membership test on an ISO timestamp. An unparseable value is
 * treated as out-of-window (defensive: never trust external/persisted data) so
 * a single bad row can never poison the aggregate with NaN. Mirrors the private
 * `inWindow` helper in ./metrics (not exported there, so re-stated here).
 */
function isWithinWindow(at: string, startMs: number, endMs: number): boolean {
  const t = Date.parse(at);
  if (Number.isNaN(t)) return false;
  return t >= startMs && t <= endMs;
}

/**
 * Aggregate persisted checks + drafted LOAs into a RoiSnapshot over one window.
 *
 * Counted only over checks whose `checkedAt` falls within
 * [windowStart, windowEnd] (inclusive):
 * - `checksRun`         — number of in-window checks
 * - `denialsPrevented`  — in-window checks that caught a blocking gap
 * - `pesosRecovered`    — Σ estimateClaimValue(serviceCode) over those denials
 * - `hoursSaved`        — checksRun·MANUAL_BASELINE_HOURS + loaDrafted·LOA_DRAFT_HOURS
 * - `avgTimeToVerifyMs` — mean durationMs (DEFAULT_VERIFY_MS where absent); 0,
 *                         never NaN, when there are no in-window checks
 *
 * @param input  org id, org-scoped check rows, and the drafted-LOA count
 * @param window the org + inclusive [start, end] reporting window
 * @returns an immutable snapshot; the caller owns presentation/rounding of ₱/hrs
 */
export function aggregateRoi(input: RoiAggregateInput, window: RoiWindow): RoiSnapshot {
  const startMs = Date.parse(window.windowStart);
  const endMs = Date.parse(window.windowEnd);

  let checksRun = 0;
  let denialsPrevented = 0;
  let pesosRecovered = 0;
  let totalVerifyMs = 0;

  for (const check of input.checks) {
    if (!isWithinWindow(check.checkedAt, startMs, endMs)) continue;

    checksRun += 1;
    // Missing latency → the documented default, so the average stays meaningful
    // until real durations are persisted (kept out of window totals otherwise).
    totalVerifyMs += check.durationMs ?? DEFAULT_VERIFY_MS;

    if (isDenialPrevented(check.gaps)) {
      denialsPrevented += 1;
      pesosRecovered += estimateClaimValue(check.serviceCode);
    }
  }

  // Admin time reclaimed: every automated in-window check displaces a manual
  // portal/phone verification, and every drafted LOA displaces a hand-draft.
  const hoursSaved =
    checksRun * MANUAL_BASELINE_HOURS + input.loaDraftedCount * LOA_DRAFT_HOURS;

  // Mean over in-window checks; guard the empty case so we return 0, never NaN.
  const avgTimeToVerifyMs = checksRun > 0 ? Math.round(totalVerifyMs / checksRun) : 0;

  // Return a fresh object (immutability): the snapshot is derived, never shared.
  return {
    orgId: input.orgId,
    checksRun,
    denialsPrevented,
    pesosRecovered,
    hoursSaved,
    avgTimeToVerifyMs,
    windowStart: window.windowStart,
    windowEnd: window.windowEnd,
  };
}
