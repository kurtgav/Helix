// Deterministic requirement rule engine. Combines what the payer adapter
// reports (retrieved from fixtures, cited) with a small, payer-agnostic LOCAL
// policy baseline, then reconciles requirement presence against the documents
// actually collected. Pure and deterministic — no I/O beyond the adapter call,
// no LLM, no clinical judgment. Administrative paperwork only.

import {
  ok,
  type Result,
  type Requirement,
  type RequirementType,
  type Service,
  type Gap,
} from "@helix/shared";
import type { PayerAdapter } from "@helix/payers";

// Source label for the Helix-local administrative baseline (not a payer rule).
export const LOCAL_POLICY_SOURCE = "policy:helix/local";

/**
 * Payer-agnostic administrative baseline: identity/membership documents that
 * Helix always asks for, independent of any specific payer's coverage rules.
 * These are administrative hygiene, NOT invented payer coverage rules.
 */
export const LOCAL_BASELINE: readonly Requirement[] = Object.freeze([
  Object.freeze({
    type: "member_id" as RequirementType,
    label: "Member ID / HMO card",
    required: true,
    present: false,
    note: LOCAL_POLICY_SOURCE,
  }),
  Object.freeze({
    type: "valid_id" as RequirementType,
    label: "Government-issued valid ID",
    required: true,
    present: false,
    note: LOCAL_POLICY_SOURCE,
  }),
]);

/**
 * Merge two requirement lists, deduped by RequirementType. The adapter's
 * (payer-specific) entry wins on label/note; `required` is OR-ed so neither
 * source can silently relax a requirement. Pure — inputs untouched.
 */
export function mergeRequirements(
  primary: readonly Requirement[],
  secondary: readonly Requirement[],
): Requirement[] {
  const byType = new Map<RequirementType, Requirement>();
  for (const req of secondary) {
    byType.set(req.type, { ...req });
  }
  for (const req of primary) {
    const existing = byType.get(req.type);
    byType.set(req.type, {
      ...req,
      required: req.required || (existing?.required ?? false),
    });
  }
  return [...byType.values()];
}

/**
 * Reconcile requirement presence against the documents actually collected.
 * Returns a NEW list with `present` set from `presentDocs` (never mutates).
 */
export function reconcilePresence(
  requirements: readonly Requirement[],
  presentDocs: readonly RequirementType[] = [],
): Requirement[] {
  const collected = new Set<RequirementType>(presentDocs);
  return requirements.map((req) => ({
    ...req,
    present: collected.has(req.type),
  }));
}

/** True once the resolved requirements include a Letter of Authorization. */
export function serviceRequiresLOA(
  requirements: readonly Requirement[],
): boolean {
  return requirements.some((req) => req.type === "loa" && req.required);
}

/**
 * Missing-document gaps: every required, absent document EXCEPT the LOA itself
 * (the agent drafts the LOA — it is not a document the patient must supply).
 * Pure and deterministic.
 */
export function detectMissingDocGaps(
  requirements: readonly Requirement[],
): Gap[] {
  return requirements
    .filter((req) => req.required && !req.present && req.type !== "loa")
    .map((req) => ({
      kind: req.type,
      message: `Missing required document: ${req.label}.`,
      blocking: true,
    }));
}

/**
 * Resolve the full requirement set for a service+plan: adapter (cited, payer-
 * specific) requirements merged with the local baseline, then reconciled
 * against collected documents. Adapter errors propagate as a Result error.
 */
export async function resolveRequirements(
  adapter: PayerAdapter,
  service: Service,
  plan: string,
  presentDocs: readonly RequirementType[] = [],
): Promise<Result<Requirement[]>> {
  const adapterResult = await adapter.getRequirements(service, plan);
  if (!adapterResult.ok) return adapterResult;

  const merged = mergeRequirements(adapterResult.data, LOCAL_BASELINE);
  return ok(reconcilePresence(merged, presentDocs));
}
