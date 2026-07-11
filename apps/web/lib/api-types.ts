// Wire types shared between the API routes and client components. TYPES ONLY —
// safe to import from client code (no runtime, no agent/LLM/PHI logic leaks).

import type { EligibilityResult, Evidence } from "@helix/shared";

/** Consistent API envelope (see ecc/patterns: API Response Format). */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface LoaDraftView {
  body: string;
  requiredDocs: string[];
  missingDocs: string[];
}

/** Flattened, client-facing view of a ProposedAction<EligibilityProposal>. */
export interface VerifyProposalView {
  kind: string;
  confidence: number;
  requiresApproval: boolean;
  rationale: string;
  evidence: Evidence[];
  eligibility: EligibilityResult;
  loaRequired: boolean;
  loaDraft?: LoaDraftView;
  encounterId?: string;
}

export interface ApproveResultView {
  status: string;
  decision: "approved" | "rejected";
}
