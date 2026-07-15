import "server-only";

// Receivables Agent (catalog #3) — the web app's server-only seam to Helix's
// THIRD AI teammate: payer accountability. It maps the synthetic demo claim
// ledger onto the shared ClaimRecord contract, runs the deterministic
// receivables agent over it (RBAC + cited evidence + human-approval gate + an
// EPHEMERAL in-memory audit), and exposes the human-in-the-loop resolve action.
//
// This domain is SYNTHETIC and administrative only: no PHI, and it NEVER
// writes to a database — the audit log is a throwaway InMemoryAuditLog built
// per call. Same seam shape as lib/revenue.ts (agent #2).

import type {
  ApprovalDecision,
  CashflowBucket,
  ClaimRecord,
  ClaimStatus,
  DeadlineAssessment,
  PayerId,
  PayerScorecard,
  ProposedAction,
  ReceivableFinding,
  ReceivableStanding,
  ReceivablesProposal,
} from "@helix/shared";
import { InMemoryAuditLog, AuthorizationError } from "@helix/core";
import { runReceivables, resolveReceivables } from "@helix/agents";
import {
  DEMO_ORG_ID,
  DEMO_CLAIM_LEDGER,
  demoClaimSubmittedAt,
  demoClaimDecidedAt,
  type DemoClaimRow,
} from "./demo";
import { requireActor } from "./auth";
import { getDict } from "./i18n/server";
import { formatPesos } from "./format";

/** The two decisions the human-in-the-loop control can submit. */
export type LedgerDecision = "approved" | "rejected";

/** Result of the resolve server action, surfaced verbatim by the UI. */
export interface LedgerResolveResult {
  ok: boolean;
  message: string;
}

/**
 * Map one synthetic demo ledger row onto the shared ClaimRecord contract. Pure.
 *
 * The payer KEY is the payer name lowercased (e.g. "PhilHealth" → "philhealth"),
 * matching the payer adapter registry keys the agent cites. `ageDays` is the
 * row's age at the fixed demo assessment time.
 */
export function toClaimRecord(row: DemoClaimRow): ClaimRecord {
  const decidedAt = demoClaimDecidedAt(row);
  return {
    id: row.id,
    payerId: row.payer.toLowerCase() as PayerId,
    payerName: row.payer,
    serviceCode: row.serviceCode,
    serviceName: row.serviceName,
    amountBilled: row.amountBilled,
    ...(row.amountPaid !== undefined ? { amountPaid: row.amountPaid } : {}),
    submittedAt: demoClaimSubmittedAt(row),
    ...(decidedAt !== undefined ? { decidedAt } : {}),
    status: row.status,
    ageDays: row.submittedAgoDays,
  };
}

/** Map the whole demo ledger to ClaimRecord[]. Pure. */
export function toClaimRecords(rows: readonly DemoClaimRow[]): ClaimRecord[] {
  return rows.map(toClaimRecord);
}

/**
 * One row of the ledger table: the agent's finding joined to the claim facts
 * it needs for display. Pure view model — no policy.
 */
export interface LedgerRow {
  claimId: string;
  serviceName: string;
  serviceCode: string;
  payerName: string;
  status: ClaimStatus;
  standing: ReceivableStanding;
  amountBilled: number;
  amountOutstanding: number;
  daysOutstanding: number;
  submittedAt: string;
  /** The payer's payment window, when the claim is still open. */
  deadline?: DeadlineAssessment;
}

/**
 * Join per-claim findings to their source claims into display rows, in the
 * agent's finding order. Pure and total — a finding whose claim is missing
 * still renders (falls back to the claim id) rather than being silently dropped.
 */
export function buildLedgerRows(
  findings: readonly ReceivableFinding[],
  claims: readonly ClaimRecord[],
): LedgerRow[] {
  const byId = new Map(claims.map((claim) => [claim.id, claim]));
  return findings.map((finding) => {
    const claim = byId.get(finding.claimId);
    return {
      claimId: finding.claimId,
      serviceName: claim?.serviceName ?? finding.claimId,
      serviceCode: claim?.serviceCode ?? "",
      payerName: claim?.payerName ?? "",
      status: claim?.status ?? "submitted",
      standing: finding.standing,
      amountBilled: claim?.amountBilled ?? finding.amountOutstanding,
      amountOutstanding: finding.amountOutstanding,
      daysOutstanding: finding.daysOutstanding,
      submittedAt: claim?.submittedAt.slice(0, 10) ?? "",
      ...(finding.deadline !== undefined ? { deadline: finding.deadline } : {}),
    };
  });
}

/** The locale strings resolveLedgerMessage needs — a structural subset of
 *  Dict["ledger"]; the server action passes its dictionary slice. */
export interface LedgerResolveLabels {
  resolvedApproved: (pesos: string) => string;
  resolvedRejected: string;
}

const EN_RESOLVE_LABELS: LedgerResolveLabels = {
  resolvedApproved: (pesos) => `Follow-ups covering ${pesos} approved — logged.`,
  resolvedRejected: "Follow-ups held — logged.",
};

/**
 * Compose the message the resolve control shows once a decision is logged.
 * Pure — the peso figure is the past-window money the approved follow-up
 * chases. `labels` defaults to EN so existing callers/tests keep behavior.
 */
export function resolveLedgerMessage(
  decision: LedgerDecision,
  amountChased: number,
  labels: LedgerResolveLabels = EN_RESOLVE_LABELS,
): string {
  return decision === "approved"
    ? labels.resolvedApproved(formatPesos(amountChased))
    : labels.resolvedRejected;
}

/** Empty-but-honest fallback so the surface always renders. */
function emptyProposal(): ProposedAction<ReceivablesProposal> {
  return {
    kind: "receivables.review",
    proposal: {
      findings: [],
      scorecards: [] as PayerScorecard[],
      forecast: [] as CashflowBucket[],
      followUpDraft: "",
      totalOutstanding: 0,
      overdueAmount: 0,
      overdueCount: 0,
      claimCount: 0,
    },
    evidence: [],
    confidence: 0,
    requiresApproval: true,
    rationale: "The ledger is temporarily unavailable.",
  };
}

/**
 * Run the Receivables Agent over the synthetic demo ledger and return the
 * ProposedAction. A FRESH InMemoryAuditLog is built per call — this domain is
 * synthetic and must NEVER touch a database. requireActor() carries the acting
 * session so RBAC attributes to the real role; every role holds
 * `revenue.review`, so the ledger is visible to viewers too (acting on it is
 * the gated step).
 */
export async function getReceivablesReview(): Promise<
  ProposedAction<ReceivablesProposal>
> {
  try {
    const actor = requireActor();
    const audit = new InMemoryAuditLog();
    const claims = toClaimRecords(DEMO_CLAIM_LEDGER);
    return await runReceivables(claims, { actor, audit, orgId: DEMO_ORG_ID });
  } catch {
    // Defense-in-depth: the surface always renders. An empty ledger is an
    // honest "nothing to work right now" state rather than a crashed page.
    return emptyProposal();
  }
}

/**
 * Human-in-the-loop resolution — the gate that proves "agents propose, humans
 * dispose". Rebuilds the review, then records an ApprovalDecision through
 * resolveReceivables, which enforces `revenue.resolve` (viewers blocked at the
 * SERVER, not merely in the UI). Everything is logged to an ephemeral audit;
 * nothing is persisted and nothing reaches a payer.
 *
 * SECURITY: a server action is a public endpoint. RBAC is enforced inside the
 * agent (assertCan) — an AuthorizationError is mapped to a friendly,
 * non-leaking message. `decision` is the only input, a typed union value.
 */
export async function resolveLedgerAction(
  decision: LedgerDecision,
): Promise<LedgerResolveResult> {
  "use server";

  try {
    const actor = requireActor();
    const audit = new InMemoryAuditLog();
    const claims = toClaimRecords(DEMO_CLAIM_LEDGER);
    const action = await runReceivables(claims, {
      actor,
      audit,
      orgId: DEMO_ORG_ID,
    });

    const approval: ApprovalDecision = {
      by: actor.userId,
      kind: decision,
      at: new Date().toISOString(),
    };
    const resolution = await resolveReceivables(action, approval, {
      actor,
      audit,
      orgId: DEMO_ORG_ID,
    });

    return {
      ok: true,
      message: resolveLedgerMessage(decision, resolution.amountChased, getDict().ledger),
    };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { ok: false, message: getDict().ledger.resolveNoPermission };
    }
    throw error;
  }
}
