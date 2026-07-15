// Revenue Cycle Agent — Helix's SECOND AI teammate (catalog #2). Given a batch
// of denied / at-risk claims it:
//   1. authorizes the actor (RBAC — `revenue.review`),
//   2. re-validates the input at the boundary (zod),
//   3. triages each claim deterministically (triage.ts — the reasoning core),
//   4. drafts a cited resubmission / appeal note (draft.ts),
//   5. assembles cited Evidence (policy source + per-payer appeal refs),
//   6. writes a citations-only, PHI-free audit entry,
//   7. returns a ProposedAction that ALWAYS requires human approval.
//
// It NEVER invents a payer rule and makes NO clinical judgment — every finding
// traces to the Helix denial-triage policy. The human-in-the-loop gate lives in
// `resolveRevenueCycle`: money is only ever counted as recovered once an
// authorized human (`revenue.resolve`, viewers blocked) approves the proposal.
// This reuses the exact substrate as the Eligibility agent: RBAC + immutable
// audit + cited evidence + human approval.

import { z } from "zod";
import type {
  DenialCase,
  RevenueCycleFinding,
  RevenueCycleProposal,
  ProposedAction,
  ApprovalDecision,
  Evidence,
} from "@helix/shared";
import { assertCan } from "@helix/core";
import { appealRule, ruleEvidence } from "@helix/payers";
import { citationsOnly } from "../evidence";
import { triageDenials, REVENUE_POLICY_SOURCE, formatPesos } from "./triage";
import { draftResubmission } from "./draft";
import type { RevenueCycleContext } from "./context";

export const REVENUE_CYCLE_ACTION_KIND = "revenue.triage";

// Confidence model. Every claim classifies into a known reason (the taxonomy is
// closed), so the only ambiguity signal is the `other` catch-all — its presence
// means at least one claim needs manual review, which lowers confidence.
const CONFIDENCE_ALL_CLASSIFIED = 0.9;
const CONFIDENCE_WITH_UNCLASSIFIED = 0.6;

// Boundary validation — never trust the caller's shape. Mirrors the fixed
// DenialReason taxonomy in the shared domain model.
const denialReasonSchema = z.enum([
  "eligibility_lapsed",
  "missing_loa",
  "missing_document",
  "service_not_covered",
  "coding_mismatch",
  "late_filing",
  "duplicate_claim",
  "other",
]);

const denialCaseSchema = z.object({
  id: z.string().min(1),
  encounterId: z.string().min(1).optional(),
  payerId: z.string().min(1),
  serviceCode: z.string().min(1),
  serviceName: z.string().min(1),
  amount: z.number().nonnegative(),
  reason: denialReasonSchema,
  deniedAt: z.string().min(1),
  ageDays: z.number().int().nonnegative(),
});

const denialCasesSchema = z.array(denialCaseSchema);

// Boundary validation for the human decision — same shape as the LOA approval
// gate so the two agents share one decision contract.
const revenueDecisionSchema = z.object({
  by: z.string().min(1),
  kind: z.enum(["approved", "rejected", "edited"]),
  at: z.string().min(1),
  note: z.string().optional(),
});

/** Outcome of the human-in-the-loop resolution. Immutable value. */
export interface RevenueCycleResolution {
  decision: ApprovalDecision;
  /** Claims marked for recovery on approval; 0 on rejection. */
  resolvedCount: number;
  /** Pesos moved into recovery on approval; 0 on rejection. */
  totalRecovered: number;
}

/**
 * Score classification confidence: high when every claim mapped to a specific
 * reason, lower when any fell to the `other` catch-all (manual review needed).
 * Pure and deterministic.
 */
export function scoreTriageConfidence(
  findings: readonly RevenueCycleFinding[],
): number {
  const hasUnclassified = findings.some((finding) => finding.reason === "other");
  return hasUnclassified ? CONFIDENCE_WITH_UNCLASSIFIED : CONFIDENCE_ALL_CLASSIFIED;
}

/**
 * Build cited evidence for the batch: the Helix policy anchor plus one appeals
 * reference per distinct payer (deduped, first-seen order). Snippets stay on the
 * evidence for the UI; the audit trail stores citations only.
 */
function buildEvidence(cases: readonly DenialCase[]): Evidence[] {
  const evidence: Evidence[] = [
    {
      source: REVENUE_POLICY_SOURCE,
      ref: "#denial-triage",
      snippet: "Helix administrative denial-triage policy baseline.",
    },
  ];

  const seenPayers = new Set<string>();
  for (const denialCase of cases) {
    if (seenPayers.has(denialCase.payerId)) continue;
    seenPayers.add(denialCase.payerId);
    evidence.push({
      source: `payer:${denialCase.payerId}/appeals`,
      ref: "#appeals",
      snippet: `${denialCase.payerId} appeals & resubmission reference.`,
    });
  }

  // One PH-rulebook citation per payer KIND in the batch — the reconsideration
  // window that governs deadline-gated recoverability above.
  const seenKinds = new Set<string>();
  for (const denialCase of cases) {
    const kind = denialCase.payerId === "philhealth" ? "philhealth" : "hmo";
    if (seenKinds.has(kind)) continue;
    seenKinds.add(kind);
    evidence.push(ruleEvidence(appealRule(kind)));
  }

  return evidence;
}

/** Administrative summary rationale for the whole proposal. */
function buildProposalRationale(
  caseCount: number,
  recoverableCount: number,
  totalRecoverable: number,
  confidence: number,
): string {
  return (
    `Triaged ${caseCount} denied/at-risk claim(s): ${recoverableCount} assessed as ` +
    `administratively recoverable (₱${formatPesos(totalRecoverable)} at stake). ` +
    `Classification confidence ${confidence.toFixed(2)}. Administrative only — no ` +
    "clinical judgment, no invented payer rule. Every resubmission/appeal requires " +
    "human approval before it reaches a payer."
  );
}

/**
 * Run the Revenue Cycle Agent for one batch of denied / at-risk claims. Returns
 * a ProposedAction that ALWAYS requires human approval. Throws AuthorizationError
 * if the actor may not review revenue, and ZodError on a malformed batch.
 *
 * RBAC note: `revenue.review` is granted to viewers too — reviewing a triage is
 * read-only. Acting on it (`resolveRevenueCycle`) is the privileged step.
 */
export async function runRevenueCycle(
  cases: DenialCase[],
  ctx: RevenueCycleContext,
): Promise<ProposedAction<RevenueCycleProposal>> {
  // 1) RBAC — nothing runs before authorization.
  assertCan(ctx.actor.role, "revenue.review");

  // 2) Boundary validation — never trust the caller's shape. The parsed data is
  //    structurally identical to DenialCase; the cast re-attaches branded ids.
  const parsedCases = denialCasesSchema.parse(cases) as DenialCase[];

  // 3) Deterministic triage (the reasoning core).
  const findings = triageDenials(parsedCases);
  const recoverableFindings = findings.filter((finding) => finding.recoverable);
  const recoverableCount = recoverableFindings.length;
  const totalRecoverable = recoverableFindings.reduce(
    (sum, finding) => sum + finding.amountAtRisk,
    0,
  );
  const caseCount = findings.length;

  // 4) Cited resubmission / appeal draft.
  const draftMessage = draftResubmission(findings, parsedCases);

  // 5) Cited evidence (policy anchor + per-payer appeal refs).
  const evidence = buildEvidence(parsedCases);

  // 6) Audit — citations only, metadata only. Snippets can carry human-readable
  //    text and must never enter the immutable log; counts are safe aggregates.
  ctx.audit.record({
    orgId: ctx.orgId,
    actorType: "agent",
    actorId: ctx.actor.userId,
    action: "revenue.reviewed",
    evidence: citationsOnly(evidence),
    metadata: { caseCount, recoverableCount, totalRecoverable },
  });

  // 7) Confidence + proposal. Requires approval, always.
  const confidence = scoreTriageConfidence(findings);
  const proposal: RevenueCycleProposal = {
    findings,
    draftMessage,
    totalRecoverable,
    recoverableCount,
    caseCount,
  };

  return {
    kind: REVENUE_CYCLE_ACTION_KIND,
    proposal,
    evidence,
    confidence,
    requiresApproval: true,
    rationale: buildProposalRationale(
      caseCount,
      recoverableCount,
      totalRecoverable,
      confidence,
    ),
  };
}

/**
 * Record a human decision on a proposed revenue-cycle action — the human-in-the-
 * loop gate for agent #2. Nothing is counted as recovered until an authorized
 * human approves here.
 *
 * - RBAC: the actor must hold `revenue.resolve` (viewers are blocked).
 * - Approve / edit: the recoverable set is confirmed for recovery
 *   (resolvedCount = recoverableCount, totalRecovered = totalRecoverable).
 * - Reject: nothing is recovered (both zero).
 *
 * Immutable — returns a new result object; the input proposal is untouched.
 * Throws AuthorizationError (unauthorized) or ZodError (malformed decision).
 */
export async function resolveRevenueCycle(
  proposal: ProposedAction<RevenueCycleProposal>,
  decision: ApprovalDecision,
  ctx: RevenueCycleContext,
): Promise<RevenueCycleResolution> {
  // 1) RBAC — only authorized roles may resolve; viewers/read-only are blocked.
  assertCan(ctx.actor.role, "revenue.resolve");

  // 2) Boundary validation for the human decision.
  const parsedDecision = revenueDecisionSchema.parse(decision);
  const isApproved =
    parsedDecision.kind === "approved" || parsedDecision.kind === "edited";

  // 3) Immutable outcome — approval confirms the recoverable set; rejection zeros.
  const resolvedCount = isApproved ? proposal.proposal.recoverableCount : 0;
  const totalRecovered = isApproved ? proposal.proposal.totalRecoverable : 0;

  // 4) Audit the decision — metadata only, no free-text note, no PHI.
  ctx.audit.record({
    orgId: ctx.orgId,
    actorType: "user",
    actorId: parsedDecision.by,
    action: "revenue.resolved",
    metadata: {
      decision: parsedDecision.kind,
      resolvedCount,
      totalRecovered,
    },
  });

  return {
    decision: parsedDecision as ApprovalDecision,
    resolvedCount,
    totalRecovered,
  };
}
