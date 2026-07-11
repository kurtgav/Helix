// ROI metrics — the number we actually sell. Pure aggregation of metric
// events into a RoiSnapshot. North star: remove one hour of admin work and
// recover one denied claim, per clinic, per day — provably.

import type { OrgId, RoiSnapshot } from "@helix/shared";

/**
 * An eligibility check completed. `durationMs` feeds avgTimeToVerifyMs and
 * `hoursSaved` records the manual verification time this check displaced
 * (a manual phone/portal check is the baseline we're beating).
 */
export interface EligibilityCheckedMetric {
  type: "eligibility.checked";
  orgId: OrgId;
  at: string; // ISO timestamp
  durationMs: number;
  manualBaselineHours: number;
}

/**
 * A gap was caught before a submission that would otherwise have been denied.
 * `pesosRecovered` is the value of the claim/service preserved.
 */
export interface DenialPreventedMetric {
  type: "denial.prevented";
  orgId: OrgId;
  at: string;
  pesosRecovered: number;
}

/** Admin time saved by automation outside of an eligibility check. */
export interface TimeSavedMetric {
  type: "time.saved";
  orgId: OrgId;
  at: string;
  hoursSaved: number;
}

export type RoiEvent =
  | EligibilityCheckedMetric
  | DenialPreventedMetric
  | TimeSavedMetric;

export interface RoiWindow {
  orgId: OrgId;
  windowStart: string; // ISO, inclusive
  windowEnd: string; // ISO, inclusive
}

function inWindow(at: string, startMs: number, endMs: number): boolean {
  const t = Date.parse(at);
  if (Number.isNaN(t)) return false;
  return t >= startMs && t <= endMs;
}

/**
 * Compute a ROI snapshot from raw events for one org over one time window.
 * Pure: no I/O, no mutation, deterministic. Events outside the window or for
 * other orgs are ignored. Empty input yields an all-zero snapshot (never NaN).
 */
export function computeRoi(events: readonly RoiEvent[], window: RoiWindow): RoiSnapshot {
  const startMs = Date.parse(window.windowStart);
  const endMs = Date.parse(window.windowEnd);

  let checksRun = 0;
  let denialsPrevented = 0;
  let pesosRecovered = 0;
  let hoursSaved = 0;
  let totalVerifyMs = 0;

  for (const event of events) {
    if (event.orgId !== window.orgId) continue;
    if (!inWindow(event.at, startMs, endMs)) continue;

    switch (event.type) {
      case "eligibility.checked":
        checksRun += 1;
        totalVerifyMs += event.durationMs;
        hoursSaved += event.manualBaselineHours;
        break;
      case "denial.prevented":
        denialsPrevented += 1;
        pesosRecovered += event.pesosRecovered;
        break;
      case "time.saved":
        hoursSaved += event.hoursSaved;
        break;
    }
  }

  const avgTimeToVerifyMs = checksRun > 0 ? Math.round(totalVerifyMs / checksRun) : 0;

  return {
    orgId: window.orgId,
    checksRun,
    denialsPrevented,
    pesosRecovered,
    hoursSaved,
    avgTimeToVerifyMs,
    windowStart: window.windowStart,
    windowEnd: window.windowEnd,
  };
}
