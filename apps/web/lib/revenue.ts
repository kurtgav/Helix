import "server-only";

// Revenue Cycle Agent (catalog #2) — the web app's server-only seam to Helix's
// SECOND AI teammate: administrative denial triage. It maps the synthetic demo
// denial cases onto the shared DenialCase contract, runs the deterministic
// triage agent over them (RBAC + cited evidence + human-approval gate + an
// EPHEMERAL in-memory audit), and exposes the human-in-the-loop resolve action.
//
// This domain is SYNTHETIC and administrative only: no PHI, and it NEVER writes
// to a database — the audit log is a throwaway InMemoryAuditLog built per call.
//
// server-only: this module runs authorization and agent reasoning; the directive
// on line 1 makes the bundler fail loudly if a Client Component imports it. The
// resolve server action is handed to the client <ResolveBar> as a PROP by the
// server page, so the client receives an RPC reference — never this module's code.

import type {
  PayerId,
  DeadlineAssessment,
  DenialCase,
  DenialReason,
  RecoveryAction,
  RevenueRisk,
  RevenueCycleFinding,
  RevenueCycleProposal,
  ProposedAction,
  ApprovalDecision,
} from "@helix/shared";
import { InMemoryAuditLog, AuthorizationError } from "@helix/core";
import { runRevenueCycle, resolveRevenueCycle } from "@helix/agents";
import { DEMO_ORG_ID, DEMO_DENIAL_CASES, type DemoDenialCase } from "./demo";
import { requireActor } from "./auth";
import { getDict } from "./i18n/server";
import { formatPesos } from "./format";

/** The two decisions the human-in-the-loop control can submit. */
export type RevenueDecision = "approved" | "rejected";

/** Result of the resolve server action, surfaced verbatim by the UI. */
export interface ResolveResult {
  ok: boolean;
  message: string;
}

/**
 * Map one synthetic demo denial row onto the shared DenialCase contract. Pure.
 *
 * The payer KEY is the payer name lowercased (e.g. "PhilHealth" → "philhealth"),
 * matching the payer adapter registry keys the agent cites. encounterId is
 * intentionally omitted — the triage reasons over administrative claim facts, not
 * the encounter graph.
 */
export function toDenialCase(row: DemoDenialCase): DenialCase {
  return {
    id: row.id,
    payerId: row.payer.toLowerCase() as PayerId,
    serviceCode: row.serviceCode,
    serviceName: row.serviceName,
    amount: row.amount,
    reason: row.reason,
    deniedAt: row.deniedAt,
    ageDays: row.ageDays,
  };
}

/** Map the whole demo denial batch to DenialCase[]. Pure. */
export function toDenialCases(rows: readonly DemoDenialCase[]): DenialCase[] {
  return rows.map(toDenialCase);
}

/**
 * One row of the triage table: the agent's finding joined to the claim facts it
 * needs for display (service label, payer key, age). Pure view model — no policy.
 */
export interface RevenueTriageRow {
  caseId: string;
  serviceName: string;
  serviceCode: string;
  payerId: string;
  amount: number;
  ageDays: number;
  reason: DenialReason;
  recommendedAction: RecoveryAction;
  recoverable: boolean;
  risk: RevenueRisk;
  requiredFixes: readonly string[];
  /** The governing recovery window (appeal/refile), when one applies. */
  deadline?: DeadlineAssessment;
}

/**
 * Join per-claim findings to their source cases into display rows, in the agent's
 * finding order. Pure and total — a finding whose case is missing still renders
 * (falls back to the case id) rather than being silently dropped.
 */
export function buildTriageRows(
  findings: readonly RevenueCycleFinding[],
  cases: readonly DenialCase[],
): RevenueTriageRow[] {
  const byId = new Map(cases.map((denialCase) => [denialCase.id, denialCase]));
  return findings.map((finding) => {
    const denialCase = byId.get(finding.caseId);
    return {
      caseId: finding.caseId,
      serviceName: denialCase?.serviceName ?? finding.caseId,
      serviceCode: denialCase?.serviceCode ?? "",
      payerId: denialCase?.payerId ?? "",
      amount: finding.amountAtRisk,
      ageDays: denialCase?.ageDays ?? 0,
      reason: finding.reason,
      recommendedAction: finding.recommendedAction,
      recoverable: finding.recoverable,
      risk: finding.risk,
      requiredFixes: finding.requiredFixes,
      ...(finding.deadline !== undefined ? { deadline: finding.deadline } : {}),
    };
  });
}

/** The locale strings resolveMessage needs — a structural subset of
 *  Dict["revenue"]; the server action passes its dictionary slice. */
export interface ResolveMessageLabels {
  resolvedApproved: (pesos: string) => string;
  resolvedRejected: string;
}

const EN_RESOLVE_LABELS: ResolveMessageLabels = {
  resolvedApproved: (pesos) => `${pesos} marked for recovery — logged.`,
  resolvedRejected: "Marked as not pursued — logged.",
};

/**
 * Compose the message the resolve control shows once a decision is logged. Pure —
 * the peso figure is the amount the resolution actually moved into recovery.
 * `labels` defaults to EN so existing callers/tests keep their behavior.
 */
export function resolveMessage(
  decision: RevenueDecision,
  totalRecovered: number,
  labels: ResolveMessageLabels = EN_RESOLVE_LABELS,
): string {
  return decision === "approved"
    ? labels.resolvedApproved(formatPesos(totalRecovered))
    : labels.resolvedRejected;
}

/**
 * Run the Revenue Cycle Agent over the synthetic demo batch and return the
 * ProposedAction. A FRESH InMemoryAuditLog is built per call — this domain is
 * synthetic and must NEVER touch a database. requireActor() carries the acting
 * session so RBAC attributes to the real role; every role holds `revenue.review`,
 * so the triage is visible to viewers too (acting on it is the gated step).
 */
export async function getRevenueTriage(): Promise<
  ProposedAction<RevenueCycleProposal>
> {
  try {
    const actor = requireActor();
    const audit = new InMemoryAuditLog();
    const cases = toDenialCases(DEMO_DENIAL_CASES);
    return await runRevenueCycle(cases, { actor, audit, orgId: DEMO_ORG_ID });
  } catch {
    // Defense-in-depth: the surface always renders. An empty triage is an honest
    // "nothing to work right now" state rather than a crashed page. (Not reachable
    // for the demo roles — every role holds revenue.review — but a future RBAC or
    // data-source change must not be able to blank the page.)
    return {
      kind: "revenue.triage",
      proposal: {
        findings: [],
        draftMessage: "",
        totalRecoverable: 0,
        recoverableCount: 0,
        caseCount: 0,
      },
      evidence: [],
      confidence: 0,
      requiresApproval: true,
      rationale: "Triage is temporarily unavailable.",
    };
  }
}

/**
 * Human-in-the-loop resolution — the gate that proves "agents propose, humans
 * dispose". Rebuilds the triage, then records an ApprovalDecision through
 * resolveRevenueCycle, which enforces `revenue.resolve` (viewers blocked at the
 * SERVER, not merely in the UI). Everything is logged to an ephemeral audit;
 * nothing is persisted and nothing reaches a payer.
 *
 * SECURITY: a server action is a public endpoint. RBAC is enforced inside the
 * agent (assertCan) — an AuthorizationError is mapped to a friendly, non-leaking
 * message. `decision` is the only input and arrives as a typed union value.
 */
export async function resolveRevenueTriageAction(
  decision: RevenueDecision,
): Promise<ResolveResult> {
  "use server";

  try {
    const actor = requireActor();
    const audit = new InMemoryAuditLog();
    const cases = toDenialCases(DEMO_DENIAL_CASES);
    const action = await runRevenueCycle(cases, {
      actor,
      audit,
      orgId: DEMO_ORG_ID,
    });

    const approval: ApprovalDecision = {
      by: actor.userId,
      kind: decision,
      at: new Date().toISOString(),
    };
    const resolution = await resolveRevenueCycle(action, approval, {
      actor,
      audit,
      orgId: DEMO_ORG_ID,
    });

    return {
      ok: true,
      message: resolveMessage(decision, resolution.totalRecovered, getDict().revenue),
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { ok: false, message: getDict().revenue.resolveNoPermission };
    }
    throw error;
  }
}
