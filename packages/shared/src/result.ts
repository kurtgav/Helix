import type { Evidence } from "./domain";

// Result envelope — explicit success/error, no thrown control flow across
// package boundaries.
export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

export type Result<T, E = AppError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

export function err<E = AppError>(error: E): Result<never, E> {
  return { ok: false, error };
}

// ProposedAction is what EVERY agent returns. Nothing reaches a payer or a
// patient without a human approving one of these. See brain/system-architecture.
export interface ProposedAction<T> {
  kind: string; // "eligibility.result" | "loa.draft" ...
  proposal: T;
  evidence: Evidence[];
  confidence: number; // 0..1
  requiresApproval: boolean;
  rationale: string;
}
