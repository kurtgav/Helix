// Receivables Agent — Helix's THIRD AI teammate (catalog #3). Given the
// clinic's submitted-claim ledger it:
//   1. authorizes the actor (RBAC — `revenue.review`; receivables ARE revenue),
//   2. re-validates the input at the boundary (zod),
//   3. assesses every claim against the payer's OWN payment obligation
//      (ledger.ts — the reasoning core),
//   4. scores each payer's measured behavior and projects the collections
//      forecast,
//   5. drafts a cited payment follow-up for the overdue set (draft.ts),
//   6. assembles cited Evidence (policy source + the payment rules in play),
//   7. writes a citations-only, PHI-free audit entry,
//   8. returns a ProposedAction that ALWAYS requires human approval.
//
// It NEVER invents a payer rule, asserts NO entitlement (the cited windows
// except claims under investigation), and makes NO clinical judgment. The
// human-in-the-loop gate lives in `resolveReceivables`: no follow-up reaches a
// payer until an authorized human (`revenue.resolve`, viewers blocked)
// approves it. Same substrate as the other agents: RBAC + immutable audit +
// cited evidence + human approval.

import { z } from "zod";
import type {
  ApprovalDecision,
  ClaimRecord,
  Evidence,
  ProposedAction,
  ReceivablesProposal,
} from "@helix/shared";
import { assertCan } from "@helix/core";
import { paymentRule, ruleEvidence } from "@helix/payers";
import { citationsOnly } from "../evidence";
import { formatPesos } from "../revenueCycle/triage";
import {
  assessReceivables,
  buildScorecards,
  forecastCashflow,
  RECEIVABLES_POLICY_SOURCE,
} from "./ledger";
import { draftFollowUp } from "./draft";
import type { ReceivablesContext } from "./context";

export const RECEIVABLES_ACTION_KIND = "receivables.review";

// Confidence model. The ledger math is deterministic; the ambiguity signal is
// forecast quality — a payer with no settled history projects on the rulebook
// default instead of measured behavior, which lowers confidence.
const CONFIDENCE_MEASURED_HISTORY = 0.9;
const CONFIDENCE_THIN_HISTORY = 0.7;

// Boundary validation — never trust the caller's shape. Mirrors the fixed
// ClaimStatus taxonomy in the shared domain model.
const claimStatusSchema = z.enum([
  "submitted",
  "in_review",
  "paid",
  "paid_partial",
  "denied",
]);

const claimRecordSchema = z.object({
  id: z.string().min(1),
  payerId: z.string().min(1),
  payerName: z.string().min(1),
  serviceCode: z.string().min(1),
  serviceName: z.string().min(1),
  amountBilled: z.number().nonnegative(),
  amountPaid: z.number().nonnegative().optional(),
  submittedAt: z.string().min(1),
  decidedAt: z.string().min(1).optional(),
  status: claimStatusSchema,
  ageDays: z.number().int().nonnegative(),
});

const claimLedgerSchema = z.array(claimRecordSchema);

// Boundary validation for the human decision — same shape as the LOA and
// revenue approval gates so all agents share one decision contract.
const receivablesDecisionSchema = z.object({
  by: z.string().min(1),
  kind: z.enum(["approved", "rejected", "edited"]),
  at: z.string().min(1),
  note: z.string().optional(),
});

/** Outcome of the human-in-the-loop resolution. Immutable value. */
export interface ReceivablesResolution {
  decision: ApprovalDecision;
  /** Overdue claims whose follow-up was approved for sending; 0 on rejection. */
  followedUpCount: number;
  /** Pesos of past-window money the approved follow-up chases; 0 on rejection. */
  amountChased: number;
}

/**
 * Score forecast confidence: high when every payer in the ledger has measured
 * settlement history, lower when any forecast leaned on the rulebook default.
 * Pure and deterministic.
 */
export function scoreLedgerConfidence(
  proposal: Pick<ReceivablesProposal, "scorecards">,
): number {
  const thinHistory = proposal.scorecards.some(
    (card) => card.medianDaysToPay === undefined,
  );
  return thinHistory ? CONFIDENCE_THIN_HISTORY : CONFIDENCE_MEASURED_HISTORY;
}

/**
 * Build cited evidence for the ledger: the Helix policy anchor plus the
 * payment rule for each payer KIND present (deduped, first-seen order).
 */
function buildEvidence(claims: readonly ClaimRecord[]): Evidence[] {
  const evidence: Evidence[] = [
    {
      source: RECEIVABLES_POLICY_SOURCE,
      ref: "#payer-accountability",
      snippet: "Helix administrative receivables policy baseline.",
    },
  ];

  const seenKinds = new Set<string>();
  for (const claim of claims) {
    const kind = claim.payerId === "philhealth" ? "philhealth" : "hmo";
    if (seenKinds.has(kind)) continue;
    seenKinds.add(kind);
    evidence.push(ruleEvidence(paymentRule(kind)));
  }

  return evidence;
}

/** Administrative summary rationale for the whole proposal. */
function buildProposalRationale(
  claimCount: number,
  overdueCount: number,
  overdueAmount: number,
  confidence: number,
): string {
  return (
    `Assessed ${claimCount} submitted claim(s) against each payer's own ` +
    `payment window: ${overdueCount} past-window (₱${formatPesos(overdueAmount)} ` +
    `outstanding). Forecast confidence ${confidence.toFixed(2)}. Administrative ` +
    "only — no entitlement asserted, no payer rule invented, no clinical " +
    "judgment. Every follow-up requires human approval before it reaches a payer."
  );
}

/**
 * Run the Receivables Agent over the clinic's claim ledger. Returns a
 * ProposedAction that ALWAYS requires human approval. Throws
 * AuthorizationError if the actor may not review revenue, and ZodError on a
 * malformed ledger.
 *
 * RBAC note: `revenue.review` is granted to viewers too — reading the ledger
 * is read-only. Acting on it (`resolveReceivables`) is the privileged step.
 */
export async function runReceivables(
  claims: ClaimRecord[],
  ctx: ReceivablesContext,
): Promise<ProposedAction<ReceivablesProposal>> {
  // 1) RBAC — nothing runs before authorization.
  assertCan(ctx.actor.role, "revenue.review");

  // 2) Boundary validation — never trust the caller's shape. The parsed data
  //    is structurally identical to ClaimRecord; the cast re-attaches branded ids.
  const parsedClaims = claimLedgerSchema.parse(claims) as ClaimRecord[];

  // 3–4) Deterministic ledger assessment (the reasoning core).
  const findings = assessReceivables(parsedClaims);
  const scorecards = buildScorecards(parsedClaims, findings);
  const forecast = forecastCashflow(parsedClaims, scorecards);

  const overdue = findings.filter((finding) => finding.standing === "overdue");
  const overdueCount = overdue.length;
  const overdueAmount = overdue.reduce(
    (sum, finding) => sum + finding.amountOutstanding,
    0,
  );
  const totalOutstanding = findings.reduce(
    (sum, finding) => sum + finding.amountOutstanding,
    0,
  );

  // 5) Cited follow-up draft for the overdue set.
  const followUpDraft = draftFollowUp(findings, parsedClaims);

  // 6) Cited evidence (policy anchor + governing payment rules).
  const evidence = buildEvidence(parsedClaims);

  // 7) Audit — citations only, metadata only. Counts are safe aggregates.
  ctx.audit.record({
    orgId: ctx.orgId,
    actorType: "agent",
    actorId: ctx.actor.userId,
    action: "receivables.reviewed",
    evidence: citationsOnly(evidence),
    metadata: {
      claimCount: findings.length,
      overdueCount,
      overdueAmount,
      totalOutstanding,
    },
  });

  // 8) Confidence + proposal. Requires approval, always.
  const proposal: ReceivablesProposal = {
    findings,
    scorecards,
    forecast,
    followUpDraft,
    totalOutstanding,
    overdueAmount,
    overdueCount,
    claimCount: findings.length,
  };
  const confidence = scoreLedgerConfidence(proposal);

  return {
    kind: RECEIVABLES_ACTION_KIND,
    proposal,
    evidence,
    confidence,
    requiresApproval: true,
    rationale: buildProposalRationale(
      findings.length,
      overdueCount,
      overdueAmount,
      confidence,
    ),
  };
}

/**
 * Record a human decision on a proposed receivables follow-up — the
 * human-in-the-loop gate for agent #3. No follow-up counts as sent until an
 * authorized human approves here.
 *
 * - RBAC: the actor must hold `revenue.resolve` (viewers are blocked).
 * - Approve / edit: the overdue set is confirmed for follow-up
 *   (followedUpCount = overdueCount, amountChased = overdueAmount).
 * - Reject: nothing is chased (both zero).
 *
 * Immutable — returns a new result object; the input proposal is untouched.
 * Throws AuthorizationError (unauthorized) or ZodError (malformed decision).
 */
export async function resolveReceivables(
  proposal: ProposedAction<ReceivablesProposal>,
  decision: ApprovalDecision,
  ctx: ReceivablesContext,
): Promise<ReceivablesResolution> {
  // 1) RBAC — only authorized roles may resolve; viewers/read-only are blocked.
  assertCan(ctx.actor.role, "revenue.resolve");

  // 2) Boundary validation for the human decision.
  const parsedDecision = receivablesDecisionSchema.parse(decision);
  const isApproved =
    parsedDecision.kind === "approved" || parsedDecision.kind === "edited";

  // 3) Immutable outcome — approval confirms the overdue set; rejection zeros.
  const followedUpCount = isApproved ? proposal.proposal.overdueCount : 0;
  const amountChased = isApproved ? proposal.proposal.overdueAmount : 0;

  // 4) Audit the decision — metadata only, no free-text note, no PHI.
  ctx.audit.record({
    orgId: ctx.orgId,
    actorType: "user",
    actorId: parsedDecision.by,
    action: "receivables.resolved",
    metadata: {
      decision: parsedDecision.kind,
      followedUpCount,
      amountChased,
    },
  });

  return {
    decision: parsedDecision as ApprovalDecision,
    followedUpCount,
    amountChased,
  };
}
