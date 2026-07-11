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

export interface EligibilityResult {
  status: EligibilityStatus;
  benefit?: string;
  requirements: Requirement[];
  gaps: Gap[];
  evidence: Evidence[];
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
