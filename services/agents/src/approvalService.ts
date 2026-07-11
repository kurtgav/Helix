// Approval service — the human-in-the-loop gate. A drafted LOA reaches a payer
// ONLY through here, and only after an authorized human decides. On approval the
// LOA is submitted via the (mock) adapter and the encounter advances through its
// state machine (awaiting_approval -> approved | rejected). Every decision is
// audited with the ApprovalDecision. Administrative only.

import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  type ProposedAction,
  type ApprovalDecision,
  type LOARequest,
  type LOAStatus,
  type EncounterStatus,
  type ServiceCategory,
  type PayerId,
  type Evidence,
} from "@helix/shared";
import { getAdapter, type LOADraft, type LOASubmission } from "@helix/payers";
import { assertCan } from "@helix/core";
import { serviceRequiresLOA } from "./rules";
import { citationsOnly } from "./evidence";
import { transitionOrThrow } from "./encounterState";
import { resolvePayerMode, nowIso, type ApprovalContext } from "./context";
import type { EligibilityProposal } from "./eligibilityAgent";

export const APPROVAL_ACTION = "loa.approved";

// Boundary validation for the human decision — never trust the caller's shape.
const approvalDecisionSchema = z.object({
  by: z.string().min(1),
  kind: z.enum(["approved", "rejected", "edited"]),
  at: z.string().min(1),
  note: z.string().optional(),
});

export interface ApprovalResult {
  decision: ApprovalDecision;
  loa: LOARequest;
  encounterStatus: EncounterStatus;
  submission?: LOASubmission;
}

function toLOADraft(
  loa: LOARequest,
  coverage: { memberId: string; planName: string },
  serviceCategory: ServiceCategory,
): LOADraft {
  return {
    payerId: loa.payerId,
    memberId: coverage.memberId,
    planName: coverage.planName,
    serviceCode: loa.serviceCode,
    serviceCategory,
    body: loa.body,
    requiredDocs: loa.requiredDocs,
  };
}

/**
 * Record a human approval decision on a proposed eligibility action.
 *
 * - RBAC: the actor must hold `loa.approve` (viewers are blocked).
 * - Approve/edit: if the service requires an LOA it is submitted via the mock
 *   adapter (status -> submitted); otherwise it is marked ready. Encounter
 *   advances to `approved`.
 * - Reject: the LOA is marked denied; the encounter advances to `rejected`.
 *
 * Throws AuthorizationError (unauthorized) or InvalidTransitionError (the
 * encounter is not awaiting approval).
 */
export async function approve(
  proposal: ProposedAction<EligibilityProposal>,
  decision: ApprovalDecision,
  ctx: ApprovalContext,
): Promise<ApprovalResult> {
  // 1) RBAC — only authorized roles may approve; viewers/staff-minus are blocked.
  assertCan(ctx.actor.role, "loa.approve");

  const parsedDecision = approvalDecisionSchema.parse(decision);
  const isApprove =
    parsedDecision.kind === "approved" || parsedDecision.kind === "edited";
  const newId = ctx.newId ?? ((prefix: string) => `${prefix}_${randomUUID()}`);

  // 2) Advance the encounter state machine (fails loudly if not awaiting_approval).
  const encounterStatus = transitionOrThrow(
    ctx.encounterStatus,
    isApprove ? "approve" : "reject",
  );

  const originalLoa = proposal.proposal.loa;
  let updatedLoa: LOARequest;
  let submission: LOASubmission | undefined;
  let evidence: Evidence[] = [];

  if (isApprove) {
    const requiresLOA = serviceRequiresLOA(proposal.proposal.eligibility.requirements);
    if (requiresLOA) {
      // 3) Submit the LOA via the (mock) adapter — cited external reference.
      const mode = resolvePayerMode(ctx.payerMode);
      const adapter = getAdapter(originalLoa.payerId as PayerId, mode);
      const submitResult = await adapter.submitLOA(
        toLOADraft(originalLoa, ctx.coverage, ctx.serviceCategory),
      );
      if (!submitResult.ok) {
        throw new Error(
          `LOA submission failed: ${submitResult.error.code} — ${submitResult.error.message}`,
        );
      }
      submission = submitResult.data;
      evidence = submission.evidence;
      updatedLoa = { ...originalLoa, status: submission.status };
    } else {
      updatedLoa = { ...originalLoa, status: "ready" satisfies LOAStatus };
    }
  } else {
    updatedLoa = { ...originalLoa, status: "denied" satisfies LOAStatus };
  }

  // 4) Audit the decision — references + decision kind only (no free-text PHI).
  ctx.audit.record({
    orgId: ctx.orgId,
    actorType: "user",
    actorId: parsedDecision.by,
    action: APPROVAL_ACTION,
    encounterId: ctx.encounterId,
    evidence: evidence.length > 0 ? citationsOnly(evidence) : undefined,
    metadata: {
      decision: parsedDecision.kind,
      loaStatus: updatedLoa.status,
      ...(submission ? { externalRef: submission.externalRef } : {}),
    },
  });

  // 5) Optional events (power ROI + downstream agents).
  if (ctx.events) {
    const at = nowIso(ctx);
    ctx.events.publish({
      id: newId("evt"),
      type: "approval.decided",
      orgId: ctx.orgId,
      at,
      payload: {
        encounterId: ctx.encounterId,
        actionKind: proposal.kind,
        decision: parsedDecision.kind,
        by: parsedDecision.by as ApprovalDecision["by"],
      },
    });
    if (submission) {
      ctx.events.publish({
        id: newId("evt"),
        type: "loa.submitted",
        orgId: ctx.orgId,
        at,
        payload: { encounterId: ctx.encounterId, serviceCode: updatedLoa.serviceCode },
      });
    }
  }

  return {
    decision: parsedDecision as ApprovalDecision,
    loa: updatedLoa,
    encounterStatus,
    ...(submission ? { submission } : {}),
  };
}
