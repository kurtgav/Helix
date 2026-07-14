import "server-only";

// Server-only seam for the /agents Executive brief. Reads LIVE ROI through the
// same agent layer the dashboard uses (getDashboardRoi persists → Postgres when
// a database is configured, else the seeded demo baseline), then runs the PURE
// brief writer over it. Kept behind server-only so the ROI/agent internals never
// bundle to the client; the presentational components receive plain data.

import type { RoiSnapshot } from "@helix/shared";
import { getDashboardRoi } from "./agents";
import { getDict } from "./i18n/server";
import { buildExecutiveBrief } from "./roster";

export interface ExecutiveBriefData {
  lines: string[];
  roi: RoiSnapshot;
  live: boolean;
}

export async function getExecutiveBrief(): Promise<ExecutiveBriefData> {
  const { roi, live } = await getDashboardRoi();
  // The brief is written in the request's locale — the dict slice satisfies
  // BriefLabels structurally.
  return { lines: buildExecutiveBrief(roi, live, getDict().agents), roi, live };
}
