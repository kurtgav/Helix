// PayerAdapter — the single interface every payer connector implements
// (repository pattern). Business logic depends on THIS, never on a specific
// payer. Mock adapters ship first (fixtures); real integrations swap in behind
// a flag once payer rules are confirmed. See brain/system-architecture.md.
//
// ADMINISTRATIVE only. Every assertion an adapter returns cites Evidence so the
// agent never invents coverage rules (retrieval before generation).

import { z } from "zod";
import {
  serviceCategorySchema,
  type Result,
  type Evidence,
  type Requirement,
  type Service,
  type EligibilityStatus,
  type LOAStatus,
  type PayerId,
} from "@helix/shared";

// --- Boundary I/O schemas: validate before we trust any caller input. ---

export const eligibilityQuerySchema = z.object({
  payerId: z.string().min(1),
  memberId: z.string().min(1),
  planName: z.string().min(1),
  service: z.object({
    code: z.string().min(1),
    name: z.string().min(1),
    category: serviceCategorySchema,
  }),
});
export type EligibilityQuery = z.infer<typeof eligibilityQuerySchema>;

export const loaDraftSchema = z.object({
  payerId: z.string().min(1),
  memberId: z.string().min(1),
  planName: z.string().min(1),
  serviceCode: z.string().min(1),
  serviceCategory: serviceCategorySchema,
  body: z.string().min(1),
  requiredDocs: z.array(z.string()),
});
export type LOADraft = z.infer<typeof loaDraftSchema>;

// --- Adapter result payloads ---

export interface EligibilityCheck {
  status: EligibilityStatus;
  benefit?: string;
  evidence: Evidence[];
}

export interface LOASubmission {
  externalRef: string;
  status: LOAStatus;
  evidence: Evidence[];
}

// --- The contract ---

export interface PayerAdapter {
  readonly payerId: PayerId;
  readonly payerName: string;

  /** Is this member active + eligible for this benefit? Cites the source. */
  checkEligibility(query: EligibilityQuery): Promise<Result<EligibilityCheck>>;

  /** What docs / approvals does this service+plan require? Cites the rule. */
  getRequirements(service: Service, plan: string): Promise<Result<Requirement[]>>;

  /** Submit (mock) an LOA draft; returns an external reference + status. */
  submitLOA(draft: LOADraft): Promise<Result<LOASubmission>>;

  /** Poll the payer for the current status of a submitted LOA. */
  getStatus(ref: string): Promise<Result<LOAStatus>>;
}
