// The AI workforce roster + the pure Executive-brief writer. This module is
// PURE and framework-free (only display formatters + domain types), so it is
// safe to import from server components AND unit-test directly. No I/O, no PHI:
// the executive brief is derived ONLY from aggregate ROI numbers.

import type { RoiSnapshot } from "@helix/shared";
import { formatPesos, formatHours, formatDuration } from "./format";

// One AI teammate in the catalog. `n` is the catalog index (1..9); the
// Supervisor orchestration layer has no number (null). `href` is set only for
// the LIVE teammates that link to a working surface.
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
// last. #1–#3 are LIVE today (verify + revenue + ledger); the rest are planned.
// `phase` reflects shipping reality: the live teammates are the v0 workforce;
// everything after follows the catalog's next / later / Phase 2.
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
    name: "Receivables",
    job: "Tracks every submitted claim against the payer's own payment window, scores payer behavior, and drafts cited follow-ups when money runs late.",
    status: "live",
    phase: "v0",
    href: "/ledger",
  },
  {
    n: 4,
    name: "Documentation",
    job: "Ingests PDFs, referrals, IDs, and discharge notes into structured, retrievable data.",
    status: "planned",
    phase: "Next",
  },
  {
    n: 5,
    name: "Coding Assist",
    job: "Suggests ICD / CPT and case-rate codes and validates claims — a human always confirms.",
    status: "planned",
    phase: "Later",
  },
  {
    n: 6,
    name: "Compliance",
    job: "Answers questions over SOPs, accreditation manuals, DPA / NPC rules, and internal policy.",
    status: "planned",
    phase: "Later",
  },
  {
    n: 7,
    name: "Reception",
    job: "Handles appointments, reminders, intake, and front-desk FAQs.",
    status: "planned",
    phase: "Later",
  },
  {
    n: 8,
    name: "Knowledge",
    job: "An org-scoped assistant over every corner of the hospital's administrative knowledge.",
    status: "planned",
    phase: "Later",
  },
  {
    n: 9,
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

/** The locale strings the brief writer needs — a structural subset of
 *  Dict["agents"], so the server seam passes its dict slice straight in.
 *  Pluralization lives inside each locale's templates. */
export interface BriefLabels {
  briefSourceLive: string;
  briefSourceDemo: string;
  briefQuiet1: string;
  briefQuiet2: string;
  briefVerified: (checks: number, pace: string) => string;
  briefPace: (duration: string) => string;
  briefCaught: (denials: number, pesos: string) => string;
  briefProtected: (pesos: string) => string;
  briefHours: (hours: string) => string;
}

const EN_BRIEF_LABELS: BriefLabels = {
  briefSourceLive: "Every figure here is computed from your approved, audited encounters.",
  briefSourceDemo:
    "These figures come from a synthetic demo baseline — connect a database to see your own.",
  briefQuiet1: "No verifications have run in this window yet.",
  briefQuiet2:
    "As your front desk verifies walk-ins, this brief fills in with coverage confirmed, denials caught before submission, and hours handed back.",
  briefVerified: (checks, pace) =>
    `This month, Helix verified ${checks} ${checks === 1 ? "walk-in" : "walk-ins"}${pace}`,
  briefPace: (duration) => `, clearing each in about ${duration}.`,
  briefCaught: (denials, pesos) =>
    `It caught ${denials} likely ${denials === 1 ? "denial" : "denials"} before submission — ${pesos} in claims kept clean.`,
  briefProtected: (pesos) => `It protected ${pesos} in claims from likely denial.`,
  briefHours: (hours) => `That handed your team back ${hours} of portal and phone work.`,
};

// PURE. Turns an ROI snapshot into a natural-language executive brief — the
// Executive Agent (catalog #8) teaser. Returns 2–4 sentences. Derives strictly
// from aggregate ROI (checks, denials prevented, pesos, hours) — never patient
// specifics. The final sentence states the data source honestly (live vs demo).
// `labels` selects the locale; defaults to EN so existing callers/tests hold.
export function buildExecutiveBrief(
  roi: RoiSnapshot,
  live: boolean,
  labels: BriefLabels = EN_BRIEF_LABELS,
): string[] {
  const checks = Math.max(0, Math.trunc(roi.checksRun));
  const denials = Math.max(0, Math.trunc(roi.denialsPrevented));
  const pesos = Math.max(0, roi.pesosRecovered);
  const hours = Math.max(0, roi.hoursSaved);

  const source = live ? labels.briefSourceLive : labels.briefSourceDemo;

  // Quiet window: nothing has run yet. Two honest sentences + the source note.
  if (checks === 0) {
    return [labels.briefQuiet1, labels.briefQuiet2, source];
  }

  const pace =
    roi.avgTimeToVerifyMs > 0 ? labels.briefPace(formatDuration(roi.avgTimeToVerifyMs)) : ".";
  const lines: string[] = [labels.briefVerified(checks, pace)];

  if (denials > 0) {
    lines.push(labels.briefCaught(denials, formatPesos(pesos)));
  } else if (pesos > 0) {
    lines.push(labels.briefProtected(formatPesos(pesos)));
  }

  if (hours > 0) {
    lines.push(labels.briefHours(formatHours(hours)));
  }

  lines.push(source);
  return lines;
}
