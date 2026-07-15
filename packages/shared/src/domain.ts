// Helix domain model — ADMINISTRATIVE only (no clinical reasoning).
// This is the contract every package builds against. Keep it stable.

import type {
  OrgId,
  UserId,
  PatientId,
  CoverageId,
  EncounterId,
  PayerId,
  LOARequestId,
  DocumentId,
} from "./ids";

export type Role = "owner" | "admin" | "staff" | "viewer";

// --- Payers ---
export type PayerKind = "philhealth" | "hmo";
export type AdapterMode = "mock" | "live";

export interface Payer {
  id: PayerId;
  name: string;
  kind: PayerKind;
  mode: AdapterMode;
}

// --- People ---
export type Sex = "M" | "F" | "X";

export interface Patient {
  id: PatientId;
  orgId: OrgId;
  fullName: string;
  birthDate: string; // ISO yyyy-mm-dd
  sex: Sex;
  createdAt: string;
}

export type CoverageStatus = "active" | "inactive" | "unknown";

export interface Coverage {
  id: CoverageId;
  patientId: PatientId;
  payerId: PayerId;
  memberId: string;
  planName: string;
  status: CoverageStatus;
  validFrom?: string;
  validTo?: string;
}

// --- Services ---
export type ServiceCategory =
  | "consult"
  | "laboratory"
  | "imaging"
  | "procedure"
  | "dialysis"
  | "dental"
  | "other";

export interface Service {
  code: string;
  name: string;
  category: ServiceCategory;
}

// --- Eligibility & requirements ---
export type EligibilityStatus = "eligible" | "ineligible" | "needs_review";

export type RequirementType =
  | "loa"
  | "referral"
  | "valid_id"
  | "member_id"
  | "doctor_request"
  | "consult_first"
  | "other";

export interface Requirement {
  type: RequirementType;
  label: string;
  required: boolean;
  present: boolean;
  note?: string;
}

export interface Gap {
  kind: RequirementType | "coverage" | "data";
  message: string;
  blocking: boolean;
}

// Citation for anything the agent asserts — retrieval before generation.
export interface Evidence {
  source: string; // e.g. "payer:maxicare/rules", "doc:referral-123"
  ref: string; // stable id / url / section
  snippet?: string;
}

// --- Policy intelligence (deterministic, cited — never invented) ---
// How the member holds the coverage. PH reality: corporate/group HMO plans
// (employer-sponsored) and individual/family plans carry materially different
// eligibility rules (waiting periods, pre-existing-condition exclusions,
// benefit limits); PhilHealth is government social insurance.
export type PolicyType = "corporate_group" | "individual_family" | "government";

// One deterministic policy check the engine ran. `fail` = administratively
// certain from cited policy data; `attention` = a human must review (e.g. a
// pre-existing-condition exclusion exists on the plan — Helix flags the RULE,
// it never judges the condition); `unknown` = the data to decide is missing.
export type PolicyCheckStatus = "pass" | "fail" | "attention" | "unknown";

export type PolicyCheckKind =
  | "coverage_window"
  | "waiting_period"
  | "pre_existing"
  | "benefit_limit"
  | "filing_window";

export interface PolicyCheck {
  kind: PolicyCheckKind;
  status: PolicyCheckStatus;
  label: string;
  detail: string;
  evidence: Evidence[];
}

// Time-bound windows (claim filing, denial appeal, LOA validity, payer
// payment obligations) assessed against a concrete date. `daysRemaining` < 0
// means the window already closed.
export type DeadlineUrgency = "expired" | "critical" | "soon" | "open";

export type DeadlineKind =
  | "claim_filing"
  | "appeal"
  | "refile"
  | "loa_validity"
  | "payer_payment";

export interface DeadlineAssessment {
  kind: DeadlineKind;
  /** ISO date the window is measured from (service date, denial date, issue date). */
  basis: string;
  /** ISO date the window closes (inclusive). */
  deadline: string;
  daysRemaining: number;
  urgency: DeadlineUrgency;
  /** Stable reference to the rule that sets the window, e.g. "reg:philhealth/circular-2018-0014". */
  ruleRef: string;
}

// The policy-relevant facts a payer adapter can retrieve for one member —
// the raw material the deterministic policy engine reasons over. Every field
// is retrieved (fixture/live), never inferred.
export interface PolicyProfile {
  policyType: PolicyType;
  planName: string;
  status: CoverageStatus;
  validFrom?: string;
  validTo?: string;
  /** When the policy took effect (drives waiting-period math). */
  effectiveDate?: string;
  /** Days after effectiveDate before non-emergency availment is covered. */
  waitingPeriodDays?: number;
  /** Months pre-existing conditions stay excluded (individual plans). */
  pecExclusionMonths?: number;
  /** True when the plan covers pre-existing conditions (typical group waiver). */
  pecCovered?: boolean;
  /** Maximum benefit limit per illness/year, in PHP. */
  mblPhp?: number;
  /** Benefit already consumed against the MBL, in PHP. */
  usedBenefitPhp?: number;
  /** Days an issued LOA stays valid for this payer/plan. */
  loaValidityDays?: number;
  evidence: Evidence[];
}

export interface EligibilityResult {
  status: EligibilityStatus;
  benefit?: string;
  requirements: Requirement[];
  gaps: Gap[];
  evidence: Evidence[];
  /** Deterministic, cited policy checks (coverage window, waiting period, …). */
  policyChecks?: PolicyCheck[];
  checkedAt: string;
}

// --- LOA / pre-authorization ---
export type LOAStatus =
  | "draft"
  | "ready"
  | "submitted"
  | "approved"
  | "denied";

export interface LOARequest {
  id: LOARequestId;
  encounterId: EncounterId;
  payerId: PayerId;
  serviceCode: string;
  status: LOAStatus;
  body: string; // drafted LOA text
  requiredDocs: string[];
  missingDocs: string[];
  createdAt: string;
}

export interface DocumentRef {
  id: DocumentId;
  encounterId: EncounterId;
  kind: string; // "referral" | "valid_id" | ...
  filename: string;
  storageKey: string; // encrypted object-store key
  uploadedAt: string;
}

// --- Encounter: the unit an agent acts on ---
export type EncounterStatus =
  | "intake"
  | "verifying"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "closed";

export interface Encounter {
  id: EncounterId;
  orgId: OrgId;
  patientId: PatientId;
  coverageId: CoverageId;
  service: Service;
  status: EncounterStatus;
  createdAt: string;
}

// --- Approval & audit ---
export type ApprovalDecisionKind = "approved" | "rejected" | "edited";

export interface ApprovalDecision {
  by: UserId;
  kind: ApprovalDecisionKind;
  at: string;
  note?: string;
}

export interface AuditEntry {
  id: string;
  orgId: OrgId;
  actorType: "agent" | "user" | "system";
  actorId: string;
  action: string; // "eligibility.checked" | "loa.drafted" | "loa.approved" ...
  encounterId?: EncounterId;
  model?: string;
  promptVersion?: string;
  evidence?: Evidence[];
  metadata?: Record<string, unknown>;
  at: string;
}

// --- ROI metrics (what we sell) ---
export interface RoiSnapshot {
  orgId: OrgId;
  checksRun: number;
  denialsPrevented: number;
  pesosRecovered: number;
  hoursSaved: number;
  avgTimeToVerifyMs: number;
  windowStart: string;
  windowEnd: string;
}

// --- Revenue Cycle Agent (catalog #2 — ADMINISTRATIVE denial triage) ---
// The second AI teammate. Given denied / at-risk claims (persisted or synthetic),
// it classifies the denial, decides if the money is recoverable, lists the fixes,
// and drafts a resubmission/appeal — as a ProposedAction<RevenueCycleProposal>
// that ALWAYS requires human approval before anything reaches a payer. It never
// invents payer rules and makes no clinical judgment.

// Fixed, auditable taxonomy — the agent classifies into these, never free-text.
export type DenialReason =
  | "eligibility_lapsed"
  | "missing_loa"
  | "missing_document"
  | "service_not_covered"
  | "coding_mismatch"
  | "late_filing"
  | "duplicate_claim"
  | "other";

export type RecoveryAction =
  | "resubmit"
  | "correct_and_resubmit"
  | "appeal"
  | "contact_payer"
  | "write_off";

export type RevenueRisk = "low" | "medium" | "high";

// One denied / at-risk claim the agent reasons over. `amount` = pesos at stake;
// `ageDays` drives late-filing risk and reimbursement-lag signals.
export interface DenialCase {
  id: string;
  encounterId?: EncounterId;
  payerId: PayerId;
  serviceCode: string;
  serviceName: string;
  amount: number;
  reason: DenialReason;
  deniedAt: string; // ISO
  ageDays: number;
  /** ISO date the service was rendered — anchors the claim-filing window. */
  serviceDate?: string;
}

// The agent's per-case determination — recoverable? which action? what fixes?
export interface RevenueCycleFinding {
  caseId: string;
  reason: DenialReason;
  recommendedAction: RecoveryAction;
  recoverable: boolean;
  amountAtRisk: number;
  requiredFixes: string[];
  risk: RevenueRisk;
  rationale: string;
  /** The governing recovery window (appeal / filing), assessed and cited. */
  deadline?: DeadlineAssessment;
}

// The full proposal the agent returns for one batch of cases.
export interface RevenueCycleProposal {
  findings: RevenueCycleFinding[];
  draftMessage: string; // cited resubmission / appeal draft
  totalRecoverable: number;
  recoverableCount: number;
  caseCount: number;
}

// --- Receivables Agent (catalog #3 — payer-accountability ledger) ---
// The third AI teammate watches the OTHER side of the payer clock: not what the
// clinic owes the payer process (filing/appeal windows) but what the payer owes
// the clinic. Every submitted claim is tracked against the payer's own payment
// obligation (PhilHealth: act within 60 days of receipt, IRR of RA 7875 §47;
// HMOs: contractual — Helix conservative default), payers are scored on how
// they actually behave, and overdue money gets a cited follow-up draft that a
// human approves before anything is sent. ADMINISTRATIVE only — no clinical
// judgment, no invented payer rule.

// Lifecycle of a submitted claim, as the clinic sees it. Closed taxonomy.
export type ClaimStatus =
  | "submitted" // filed with the payer, no decision yet
  | "in_review" // payer acknowledged / asked questions (still their clock)
  | "paid" // settled in full
  | "paid_partial" // settled below the billed amount (shortfall)
  | "denied"; // refused — hands off to the Revenue Cycle agent

// One submitted claim the receivables engine reasons over. `ageDays` is the
// claim's age at assessment time (same deterministic device as DenialCase —
// "today" is reconstructed from submittedAt + ageDays, never the wall clock).
export interface ClaimRecord {
  id: string;
  payerId: PayerId;
  payerName: string;
  serviceCode: string;
  serviceName: string;
  /** Pesos billed to the payer. */
  amountBilled: number;
  /** Pesos actually settled (paid / paid_partial rows only). */
  amountPaid?: number;
  submittedAt: string; // ISO
  /** ISO date the payer decided (paid/denied rows only). */
  decidedAt?: string;
  status: ClaimStatus;
  ageDays: number;
}

// Where one open claim stands against the payer's payment obligation.
export type ReceivableStanding =
  | "on_track" // window open, not near the edge
  | "due_soon" // payer's window closes within the urgency threshold
  | "overdue" // payer's own deadline has passed — follow up with citation
  | "settled" // paid in full, nothing outstanding
  | "underpaid" // settled short of billed — shortfall to reconcile
  | "denied"; // routed to denial triage, not a receivable anymore

// The engine's per-claim determination.
export interface ReceivableFinding {
  claimId: string;
  standing: ReceivableStanding;
  /** Pesos still unpaid on this claim (billed − paid; 0 when settled). */
  amountOutstanding: number;
  /** Days since submission at assessment time. */
  daysOutstanding: number;
  /** The payer's payment window, assessed and cited (open claims only). */
  deadline?: DeadlineAssessment;
  /** Short, cited administrative rationale. */
  rationale: string;
}

// How one payer actually behaves, measured from the ledger — the clinic's
// negotiation ammunition. All rates are 0..1; medians are in days.
export interface PayerScorecard {
  payerId: PayerId;
  payerName: string;
  claimCount: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
  overdueAmount: number;
  /** Median days from submission to decision (settled claims only). */
  medianDaysToPay?: number;
  /** Share of decided claims settled within the payer's own window. */
  onTimeRate?: number;
  /** Share of settled claims paid below billed. */
  shortfallRate?: number;
  /** Share of decided claims denied. */
  denialRate?: number;
  /** A–D behavior grade derived from on-time + shortfall performance. */
  grade: "A" | "B" | "C" | "D";
}

// One bucket of the collections forecast: pesos expected in a coming window,
// projected from each payer's OBSERVED behavior (median days-to-pay), falling
// back to the cited rulebook window when history is thin.
export interface CashflowBucket {
  /** Bucket start, ISO date (inclusive). */
  from: string;
  /** Bucket end, ISO date (inclusive); omitted on the open-ended tail. */
  to?: string;
  label: string;
  expectedAmount: number;
  claimCount: number;
}

// The full proposal the Receivables agent returns for one ledger snapshot.
export interface ReceivablesProposal {
  findings: ReceivableFinding[];
  scorecards: PayerScorecard[];
  forecast: CashflowBucket[];
  /** Cited follow-up draft covering every overdue claim. */
  followUpDraft: string;
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
  claimCount: number;
}
