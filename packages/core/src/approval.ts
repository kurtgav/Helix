// Approval policy — the human-in-the-loop gate as a first-class primitive.
// Rule (non-negotiable): anything that leaves the building — a payer
// submission, a patient-facing message — ALWAYS requires human approval,
// regardless of org policy. See brain/system-architecture + security-and-compliance.

/**
 * Action kinds that produce an outbound, externally-visible side effect.
 * These can NEVER be auto-approved. Match against ProposedAction.kind.
 */
export const OUTBOUND_ACTION_KINDS = [
  "loa.submit",
  "payer.submit",
  "claim.submit",
  "patient.message",
  "patient.notify",
] as const;

export type OutboundActionKind = (typeof OUTBOUND_ACTION_KINDS)[number];

/**
 * Per-org/role approval configuration. Lists the internal (non-outbound)
 * action kinds that MAY run without human approval. Empty/absent means the
 * safe default: everything requires approval.
 */
export interface ApprovalPolicy {
  autoApproveKinds: readonly string[];
}

/** The safe default: no action auto-approves. */
export const STRICT_APPROVAL_POLICY: ApprovalPolicy = Object.freeze({
  autoApproveKinds: Object.freeze([]),
});

/** True if the action kind produces an outbound, externally-visible effect. */
export function isOutboundAction(actionKind: string): boolean {
  return (OUTBOUND_ACTION_KINDS as readonly string[]).includes(actionKind);
}

/**
 * Pure decision: does this action kind require human approval before it runs?
 *
 * - Outbound actions ALWAYS require approval (policy cannot override).
 * - Otherwise, an action requires approval unless the policy explicitly
 *   lists it as auto-approvable.
 * - With no policy, default to requiring approval (fail safe).
 */
export function requiresApproval(actionKind: string, policy?: ApprovalPolicy): boolean {
  if (isOutboundAction(actionKind)) {
    return true;
  }
  if (!policy) {
    return true;
  }
  return !policy.autoApproveKinds.includes(actionKind);
}
