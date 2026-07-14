// LIVE ROI — the bridge from PERSISTED administrative activity to the
// RoiSnapshot the dashboard sells. This is the I/O seam and nothing more: it
// reads an org's eligibility checks + drafted LOAs, shapes them into plain rows,
// and hands them to the PURE aggregator in @helix/core, where every economic
// decision lives and is unit-tested. Because all logic is upstream, this file
// stays thin and needs no live-DB unit test. Injection-safe (Drizzle typed
// queries only), strictly org-scoped, and it reads no PHI (only service codes,
// gap flags, and timestamps).

import { aggregateRoi } from "@helix/core";
import type { RoiCheckRow, RoiWindow } from "@helix/core";
import type { OrgId, RoiSnapshot } from "@helix/shared";
import { count, eq } from "drizzle-orm";
import { getDb } from "./client";
import { eligibilityChecks, encounters, loaRequests } from "./schema";

/**
 * Compute a live RoiSnapshot for one org over one window, from persisted rows.
 *
 * @param orgId  the tenant to report on (org-scopes every query)
 * @param window inclusive [windowStart, windowEnd] the aggregator filters checks by
 * @returns the aggregated snapshot (all-zero, never NaN, when the org has no activity)
 */
export async function computeRoiFromDb(orgId: string, window: RoiWindow): Promise<RoiSnapshot> {
  const db = getDb();

  // Eligibility checks joined to their encounter, scoped to this org. We read
  // only what ROI needs: serviceCode (to value a prevented denial), gaps (to
  // detect a would-be denial), and checkedAt (to window the row). eligibility_checks
  // carries no org column, so the org filter rides on the joined encounter.
  const rows = await db
    .select({
      serviceCode: encounters.serviceCode,
      gaps: eligibilityChecks.gaps,
      checkedAt: eligibilityChecks.checkedAt,
      durationMs: eligibilityChecks.durationMs,
    })
    .from(eligibilityChecks)
    .innerJoin(encounters, eq(eligibilityChecks.encounterId, encounters.id))
    .where(eq(encounters.orgId, orgId));

  // Count drafted LOAs for the org (each row = one hand-draft displaced). Joined
  // through encounters because loa_requests, like checks, has no org column.
  // NOTE: this is the org total, not window-filtered — LOA rows carry no
  // aggregation-relevant timestamp in this cut; refine if window-scoping is needed.
  const [loaCountRow] = await db
    .select({ value: count() })
    .from(loaRequests)
    .innerJoin(encounters, eq(loaRequests.encounterId, encounters.id))
    .where(eq(encounters.orgId, orgId));
  const loaDraftedCount = loaCountRow?.value ?? 0;

  // durationMs is the MEASURED verify latency persisted with each check (null
  // on rows that predate measurement); the aggregator substitutes its
  // documented DEFAULT_VERIFY_MS only for those legacy nulls, so the dashboard
  // average is measured wherever measurement exists.
  const checks: RoiCheckRow[] = rows.map((row) => ({
    serviceCode: row.serviceCode,
    gaps: row.gaps ?? [], // jsonb is NOT NULL by schema; ?? [] is belt-and-suspenders
    checkedAt: row.checkedAt.toISOString(),
    ...(row.durationMs === null ? {} : { durationMs: row.durationMs }),
  }));

  return aggregateRoi({ orgId: orgId as OrgId, checks, loaDraftedCount }, window);
}
