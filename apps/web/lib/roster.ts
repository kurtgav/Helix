// The AI workforce roster + the pure Executive-brief writer. This module is
// PURE and framework-free (only display formatters + domain types), so it is
// safe to import from server components AND unit-test directly. No I/O, no PHI:
// the executive brief is derived ONLY from aggregate ROI numbers.

import type { RoiSnapshot } from "@helix/shared";
import { formatPesos, formatHours, formatDuration } from "./format";

// One AI teammate in the catalog. `n` is the catalog index (1..8); the
// Supervisor orchestration layer has no number (null). `href` is set only for
// the two LIVE teammates that link to a working surface.
export interface AgentTeammate {
  n: number | null;
  name: string;
  job: string;
  status: "live" | "planned";
  phase: string;
  href?: string;
}

// The catalog, in build order (brain/architecture/agent-catalog.md). Each agent
// shares the same substrate: tools/adapters + retrieval + LLM + human-approval
// gate + audit. We ship them one at a time, earning each with the ROI of the
// last. #1 and #2 are LIVE today (verify + revenue); the rest are planned.
// `phase` reflects shipping reality: the two live teammates are the v0
// workforce; everything after follows the catalog's next / later / Phase 2.
export const ROSTER: readonly AgentTeammate[] = [
  {
    n: 1,
    name: "Eligibility & Pre-Auth",
    job: "Verifies coverage, determines LOA needs, drafts the LOA, and flags missing documents.",
    status: "live",
    phase: "v0",
    href: "/verify",
  },
  {
    n: 2,
    name: "Revenue Cycle",
    job: "Monitors denials, reimbursement lag, and revenue leakage — then proposes fixes and resubmissions.",
    status: "live",
    phase: "v0",
    href: "/revenue",
  },
  {
    n: 3,
    name: "Documentation",
    job: "Ingests PDFs, referrals, IDs, and discharge notes into structured, retrievable data.",
    status: "planned",
    phase: "Next",
  },
  {
    n: 4,
    name: "Coding Assist",
    job: "Suggests ICD / CPT and case-rate codes and validates claims — a human always confirms.",
    status: "planned",
    phase: "Later",
  },
  {
    n: 5,
    name: "Compliance",
    job: "Answers questions over SOPs, accreditation manuals, DPA / NPC rules, and internal policy.",
    status: "planned",
    phase: "Later",
  },
  {
    n: 6,
    name: "Reception",
    job: "Handles appointments, reminders, intake, and front-desk FAQs.",
    status: "planned",
    phase: "Later",
  },
  {
    n: 7,
    name: "Knowledge",
    job: "An org-scoped assistant over every corner of the hospital's administrative knowledge.",
    status: "planned",
    phase: "Later",
  },
  {
    n: 8,
    name: "Executive",
    job: "Writes the daily ops, risk, and revenue summary with recommendations — not dashboards.",
    status: "planned",
    phase: "Later",
  },
  {
    n: null,
    name: "Supervisor",
    job: "Coordinates the teammates and runs multi-agent workflows across the roster.",
    status: "planned",
    phase: "Phase 2",
  },
];

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

// PURE. Turns an ROI snapshot into a natural-language executive brief — the
// Executive Agent (catalog #8) teaser. Returns 2–4 sentences. Derives strictly
// from aggregate ROI (checks, denials prevented, pesos, hours) — never patient
// specifics. The final sentence states the data source honestly (live vs demo).
export function buildExecutiveBrief(roi: RoiSnapshot, live: boolean): string[] {
  const checks = Math.max(0, Math.trunc(roi.checksRun));
  const denials = Math.max(0, Math.trunc(roi.denialsPrevented));
  const pesos = Math.max(0, roi.pesosRecovered);
  const hours = Math.max(0, roi.hoursSaved);

  const source = live
    ? "Every figure here is computed from your approved, audited encounters."
    : "These figures come from a synthetic demo baseline — connect a database to see your own.";

  // Quiet window: nothing has run yet. Two honest sentences + the source note.
  if (checks === 0) {
    return [
      "No verifications have run in this window yet.",
      "As your front desk verifies walk-ins, this brief fills in with coverage confirmed, denials caught before submission, and hours handed back.",
      source,
    ];
  }

  const pace =
    roi.avgTimeToVerifyMs > 0
      ? `, clearing each in about ${formatDuration(roi.avgTimeToVerifyMs)}.`
      : ".";
  const lines: string[] = [
    `This month, Helix verified ${checks} ${plural(checks, "walk-in", "walk-ins")}${pace}`,
  ];

  if (denials > 0) {
    lines.push(
      `It caught ${denials} likely ${plural(denials, "denial", "denials")} before submission — ${formatPesos(pesos)} in claims kept clean.`,
    );
  } else if (pesos > 0) {
    lines.push(`It protected ${formatPesos(pesos)} in claims from likely denial.`);
  }

  if (hours > 0) {
    lines.push(`That handed your team back ${formatHours(hours)} of portal and phone work.`);
  }

  lines.push(source);
  return lines;
}
