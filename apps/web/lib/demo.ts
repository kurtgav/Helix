// Seeded demo data for the v0 slice. Synthetic only — no real patient data.
// The demo org is "Helix Diagnostics, Makati". ROI events below feed
// @helix/core computeRoi so the dashboard shows a believable running total.

import type {
  OrgId,
  RoiSnapshot,
  EncounterStatus,
  EligibilityStatus,
  LOAStatus,
  DenialReason,
  ClaimStatus,
} from "@helix/shared";
import { computeRoi, type RoiEvent, type RoiWindow } from "@helix/core";

export const DEMO_ORG_ID = "org_helix_diagnostics_makati" as OrgId;
export const DEMO_ORG_NAME = "Helix Diagnostics, Makati";

// Payers the front desk can pick. IDs match the payer adapter registry keys.
export interface PayerOption {
  id: string;
  name: string;
}

export const DEMO_PAYERS: readonly PayerOption[] = [
  { id: "maxicare", name: "Maxicare" },
  { id: "philhealth", name: "PhilHealth" },
];

// Common walk-in services (administrative catalog only).
export interface ServiceOption {
  code: string;
  name: string;
  category:
    | "consult"
    | "laboratory"
    | "imaging"
    | "procedure"
    | "dialysis"
    | "dental"
    | "other";
}

export const DEMO_SERVICES: readonly ServiceOption[] = [
  { code: "MRI-BRAIN", name: "MRI (Brain, plain)", category: "imaging" },
  { code: "CBC", name: "Complete Blood Count (CBC)", category: "laboratory" },
  { code: "HD-SESSION", name: "Hemodialysis session", category: "dialysis" },
  { code: "CONSULT-IM", name: "Consult (Internal Medicine)", category: "consult" },
];

// A month of synthetic activity for the demo org. Deterministic so the panel
// reads the same on every load. Roughly: ~180 checks, 37 denials prevented,
// ~22 hours saved — the numbers in the demo script.
function seededEvents(): RoiEvent[] {
  const events: RoiEvent[] = [];
  const base = Date.UTC(2026, 6, 1, 9, 0, 0); // 2026-07-01
  const day = 24 * 60 * 60 * 1000;

  // 180 eligibility checks spread across the month; each displaces ~7 min of
  // manual portal/phone verification (0.117 hr) and takes ~1.8s of agent time.
  for (let i = 0; i < 180; i++) {
    events.push({
      type: "eligibility.checked",
      orgId: DEMO_ORG_ID,
      at: new Date(base + (i % 28) * day).toISOString(),
      durationMs: 1500 + (i % 5) * 150,
      manualBaselineHours: 0.117,
    });
  }

  // 37 would-be denials caught before submission, varied peso value.
  const claimValues = [8500, 12000, 3200, 22000, 6400];
  for (let i = 0; i < 37; i++) {
    events.push({
      type: "denial.prevented",
      orgId: DEMO_ORG_ID,
      at: new Date(base + (i % 28) * day).toISOString(),
      pesosRecovered: claimValues[i % claimValues.length]!,
    });
  }

  // Extra admin time saved by drafting LOAs automatically.
  for (let i = 0; i < 6; i++) {
    events.push({
      type: "time.saved",
      orgId: DEMO_ORG_ID,
      at: new Date(base + (i % 28) * day).toISOString(),
      hoursSaved: 0.25,
    });
  }

  return events;
}

const DEMO_WINDOW: RoiWindow = {
  orgId: DEMO_ORG_ID,
  windowStart: "2026-07-01T00:00:00.000Z",
  windowEnd: "2026-07-31T23:59:59.999Z",
};

/** Compute the demo org's ROI snapshot from seeded events (pure). */
export function demoRoiSnapshot(): RoiSnapshot {
  return computeRoi(seededEvents(), DEMO_WINDOW);
}

// ---------------------------------------------------------------------------
// Synthetic operations history — what the Operations Console renders when no
// database is configured (mock mode). Data-minimized to patient INITIALS even
// though it is fully synthetic, mirroring the no-PHI discipline of the audit
// trail. Deterministic so the console reads identically on every load.
// ---------------------------------------------------------------------------

export interface DemoEncounterRow {
  id: string;
  patientInitials: string;
  payer: string;
  service: string;
  status: EncounterStatus;
  eligibility: EligibilityStatus;
  loaStatus: LOAStatus;
  blockingGaps: number;
  pesosAtRisk: number;
  at: string; // ISO
}

const DAY = 24 * 60 * 60 * 1000;
const HISTORY_BASE = Date.UTC(2026, 6, 12, 8, 30, 0); // 2026-07-12 08:30Z

function ago(hours: number): string {
  return new Date(HISTORY_BASE - hours * 60 * 60 * 1000).toISOString();
}

export const DEMO_ENCOUNTERS: readonly DemoEncounterRow[] = [
  { id: "enc_9f21", patientInitials: "J.D.C.", payer: "Maxicare", service: "MRI (Brain, plain)", status: "approved", eligibility: "eligible", loaStatus: "submitted", blockingGaps: 0, pesosAtRisk: 12000, at: ago(1.5) },
  { id: "enc_8c04", patientInitials: "M.R.S.", payer: "PhilHealth", service: "Complete Blood Count (CBC)", status: "approved", eligibility: "eligible", loaStatus: "ready", blockingGaps: 0, pesosAtRisk: 850, at: ago(2.2) },
  { id: "enc_7b93", patientInitials: "A.L.P.", payer: "Maxicare", service: "Hemodialysis session", status: "awaiting_approval", eligibility: "eligible", loaStatus: "draft", blockingGaps: 1, pesosAtRisk: 4200, at: ago(3.1) },
  { id: "enc_6a55", patientInitials: "R.T.V.", payer: "Intellicare", service: "MRI (Brain, plain)", status: "awaiting_approval", eligibility: "needs_review", loaStatus: "draft", blockingGaps: 2, pesosAtRisk: 12000, at: ago(4.6) },
  { id: "enc_5f38", patientInitials: "C.M.D.", payer: "Maxicare", service: "Consult (Internal Medicine)", status: "approved", eligibility: "eligible", loaStatus: "ready", blockingGaps: 0, pesosAtRisk: 700, at: ago(6.0) },
  { id: "enc_4e21", patientInitials: "E.S.B.", payer: "PhilHealth", service: "Complete Blood Count (CBC)", status: "rejected", eligibility: "ineligible", loaStatus: "denied", blockingGaps: 1, pesosAtRisk: 850, at: ago(7.4) },
  { id: "enc_3d17", patientInitials: "N.G.A.", payer: "Medicard", service: "Hemodialysis session", status: "approved", eligibility: "eligible", loaStatus: "submitted", blockingGaps: 0, pesosAtRisk: 4200, at: ago(9.2) },
  { id: "enc_2c88", patientInitials: "L.F.R.", payer: "Maxicare", service: "MRI (Brain, plain)", status: "approved", eligibility: "eligible", loaStatus: "submitted", blockingGaps: 0, pesosAtRisk: 12000, at: ago(11.5) },
  { id: "enc_1b62", patientInitials: "P.Q.T.", payer: "Intellicare", service: "Consult (Internal Medicine)", status: "closed", eligibility: "eligible", loaStatus: "ready", blockingGaps: 0, pesosAtRisk: 700, at: ago(26) },
  { id: "enc_0a39", patientInitials: "D.H.M.", payer: "Maxicare", service: "Hemodialysis session", status: "awaiting_approval", eligibility: "eligible", loaStatus: "draft", blockingGaps: 1, pesosAtRisk: 4200, at: ago(28) },
  { id: "enc_f2e7", patientInitials: "S.V.C.", payer: "PhilHealth", service: "Complete Blood Count (CBC)", status: "approved", eligibility: "eligible", loaStatus: "ready", blockingGaps: 0, pesosAtRisk: 850, at: ago(30) },
  { id: "enc_e1d4", patientInitials: "B.K.L.", payer: "Medicard", service: "MRI (Brain, plain)", status: "approved", eligibility: "eligible", loaStatus: "submitted", blockingGaps: 0, pesosAtRisk: 12000, at: ago(33) },
];

// Synthetic denial / at-risk cases for the Revenue Cycle Agent demo (mock mode).
export interface DemoDenialCase {
  id: string;
  encounterRef: string;
  payer: string;
  serviceCode: string;
  serviceName: string;
  amount: number;
  reason: DenialReason;
  ageDays: number;
  deniedAt: string;
}

// Synthetic submitted-claim ledger for the Receivables Agent demo (mock mode).
// The story is deliberate: Maxicare settles fast and clean (grade A), Intellicare
// slips past its window once (B), PhilHealth is punctual but one claim has
// outrun even the verified 60-day rule (B), and Medicard is the villain —
// overdue money and an underpayment (D). Ages are days since submission at
// assessment time; dates anchor to HISTORY_BASE so the ledger reads identically
// on every load.
export interface DemoClaimRow {
  id: string;
  payer: string;
  serviceCode: string;
  serviceName: string;
  amountBilled: number;
  amountPaid?: number;
  submittedAgoDays: number;
  decidedAgoDays?: number;
  status: ClaimStatus;
}

function agoDays(days: number): string {
  return new Date(HISTORY_BASE - days * DAY).toISOString();
}

export const DEMO_CLAIM_LEDGER: readonly DemoClaimRow[] = [
  // Maxicare — pays in ~20 days, in full. The benchmark payer.
  { id: "clm_7001", payer: "Maxicare", serviceCode: "MRI-BRAIN", serviceName: "MRI (Brain, plain)", amountBilled: 12000, amountPaid: 12000, submittedAgoDays: 60, decidedAgoDays: 42, status: "paid" },
  { id: "clm_7002", payer: "Maxicare", serviceCode: "CBC", serviceName: "Complete Blood Count (CBC)", amountBilled: 850, amountPaid: 850, submittedAgoDays: 45, decidedAgoDays: 24, status: "paid" },
  { id: "clm_7003", payer: "Maxicare", serviceCode: "HD-SESSION", serviceName: "Hemodialysis session", amountBilled: 4200, amountPaid: 4200, submittedAgoDays: 30, decidedAgoDays: 10, status: "paid" },
  { id: "clm_7004", payer: "Maxicare", serviceCode: "CONSULT-IM", serviceName: "Consult (Internal Medicine)", amountBilled: 700, submittedAgoDays: 12, status: "submitted" },
  // Intellicare — one settlement blew past the 45-day operating window.
  { id: "clm_7101", payer: "Intellicare", serviceCode: "MRI-BRAIN", serviceName: "MRI (Brain, plain)", amountBilled: 12000, amountPaid: 12000, submittedAgoDays: 70, decidedAgoDays: 15, status: "paid" },
  { id: "clm_7102", payer: "Intellicare", serviceCode: "CBC", serviceName: "Complete Blood Count (CBC)", amountBilled: 850, amountPaid: 850, submittedAgoDays: 50, decidedAgoDays: 12, status: "paid" },
  { id: "clm_7103", payer: "Intellicare", serviceCode: "HD-SESSION", serviceName: "Hemodialysis session", amountBilled: 4200, submittedAgoDays: 38, status: "submitted" },
  // Medicard — the ledger's villain: two claims past the window, one short-paid.
  { id: "clm_7201", payer: "Medicard", serviceCode: "MRI-BRAIN", serviceName: "MRI (Brain, plain)", amountBilled: 12000, submittedAgoDays: 62, status: "submitted" },
  { id: "clm_7202", payer: "Medicard", serviceCode: "HD-SESSION", serviceName: "Hemodialysis session", amountBilled: 4200, submittedAgoDays: 75, status: "submitted" },
  { id: "clm_7203", payer: "Medicard", serviceCode: "CBC", serviceName: "Complete Blood Count (CBC)", amountBilled: 850, amountPaid: 600, submittedAgoDays: 90, decidedAgoDays: 20, status: "paid_partial" },
  { id: "clm_7204", payer: "Medicard", serviceCode: "CONSULT-IM", serviceName: "Consult (Internal Medicine)", amountBilled: 700, submittedAgoDays: 20, status: "in_review" },
  // PhilHealth — punctual on paper, but one claim outran the verified 60-day rule.
  { id: "clm_7301", payer: "PhilHealth", serviceCode: "CBC", serviceName: "Complete Blood Count (CBC)", amountBilled: 850, amountPaid: 850, submittedAgoDays: 55, decidedAgoDays: 5, status: "paid" },
  { id: "clm_7302", payer: "PhilHealth", serviceCode: "HD-SESSION", serviceName: "Hemodialysis session", amountBilled: 4200, submittedAgoDays: 68, status: "submitted" },
  { id: "clm_7303", payer: "PhilHealth", serviceCode: "CBC", serviceName: "Complete Blood Count (CBC)", amountBilled: 850, submittedAgoDays: 40, decidedAgoDays: 25, status: "denied" },
];

/** Resolve a demo ledger row's ISO submission timestamp. Pure. */
export function demoClaimSubmittedAt(row: DemoClaimRow): string {
  return agoDays(row.submittedAgoDays);
}

/** Resolve a demo ledger row's ISO decision timestamp, when decided. Pure. */
export function demoClaimDecidedAt(row: DemoClaimRow): string | undefined {
  return row.decidedAgoDays === undefined ? undefined : agoDays(row.decidedAgoDays);
}

export const DEMO_DENIAL_CASES: readonly DemoDenialCase[] = [
  { id: "dc_5521", encounterRef: "enc_4e21", payer: "PhilHealth", serviceCode: "CBC", serviceName: "Complete Blood Count (CBC)", amount: 850, reason: "eligibility_lapsed", ageDays: 3, deniedAt: new Date(HISTORY_BASE - 3 * DAY).toISOString() },
  { id: "dc_5522", encounterRef: "enc_6a55", payer: "Intellicare", serviceCode: "MRI-BRAIN", serviceName: "MRI (Brain, plain)", amount: 12000, reason: "missing_loa", ageDays: 5, deniedAt: new Date(HISTORY_BASE - 5 * DAY).toISOString() },
  { id: "dc_5523", encounterRef: "enc_7b93", payer: "Maxicare", serviceCode: "HD-SESSION", serviceName: "Hemodialysis session", amount: 4200, reason: "missing_document", ageDays: 2, deniedAt: new Date(HISTORY_BASE - 2 * DAY).toISOString() },
  { id: "dc_5524", encounterRef: "enc_2c88", payer: "Maxicare", serviceCode: "MRI-BRAIN", serviceName: "MRI (Brain, plain)", amount: 12000, reason: "coding_mismatch", ageDays: 8, deniedAt: new Date(HISTORY_BASE - 8 * DAY).toISOString() },
  { id: "dc_5525", encounterRef: "enc_3d17", payer: "Medicard", serviceCode: "HD-SESSION", serviceName: "Hemodialysis session", amount: 4200, reason: "late_filing", ageDays: 61, deniedAt: new Date(HISTORY_BASE - 61 * DAY).toISOString() },
  { id: "dc_5526", encounterRef: "enc_5f38", payer: "Maxicare", serviceCode: "CONSULT-IM", serviceName: "Consult (Internal Medicine)", amount: 700, reason: "duplicate_claim", ageDays: 12, deniedAt: new Date(HISTORY_BASE - 12 * DAY).toISOString() },
];
