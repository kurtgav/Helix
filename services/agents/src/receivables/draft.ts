// Follow-up drafting — turns overdue receivable findings into a professional,
// cited payment follow-up the biller sends to each payer. It lists ONLY claims
// whose payer window has already closed (on-track and due-soon money is not
// chased — premature demands burn payer relationships), grouped per payer so
// each section cites the window that actually governs that payer.
//
// Like the LOA and resubmission drafters, this is administrative letter text
// ONLY: it asserts a follow-up request, not an entitlement (PhilHealth's own
// rule excepts claims under investigation), and invents NO payer rule — every
// citation comes from the PH rulebook. Pure and deterministic.

import type { ClaimRecord, ReceivableFinding } from "@helix/shared";
import { paymentRule, ruleEvidence } from "@helix/payers";
import { formatPesos } from "../revenueCycle/triage";
import { RECEIVABLES_POLICY_SOURCE } from "./ledger";

const FOLLOW_UP_HEADER = "RE: Payment status follow-up on submitted claims";
const APPROVAL_FOOTER =
  "Every follow-up above requires authorized human approval before it is " +
  "transmitted to a payer.";

function payerKindOf(payerId: string): "philhealth" | "hmo" {
  return payerId === "philhealth" ? "philhealth" : "hmo";
}

/**
 * Draft a cited payment follow-up covering every OVERDUE claim in the ledger.
 * Grouped per payer (first-seen order), each group citing the payment window
 * that governs it. Deterministic — same findings produce the same text.
 */
export function draftFollowUp(
  findings: readonly ReceivableFinding[],
  claims: readonly ClaimRecord[],
): string {
  const claimById = new Map(claims.map((claim) => [claim.id, claim]));
  const overdue = findings.filter((finding) => finding.standing === "overdue");

  const lines: string[] = [FOLLOW_UP_HEADER, ""];

  // Nothing overdue — say so plainly rather than emitting an empty demand.
  if (overdue.length === 0) {
    lines.push(
      "No submitted claim is past its payer's payment window as of this",
      "assessment. Nothing to chase — the ledger is current.",
      "",
      `Prepared by Helix (administrative draft, ${RECEIVABLES_POLICY_SOURCE}).`,
      "No entitlement is asserted. Requires authorized human approval before",
      "any payer contact.",
    );
    return lines.join("\n");
  }

  // Group overdue claims per payer, first-seen order.
  const order: string[] = [];
  const grouped = new Map<string, ReceivableFinding[]>();
  for (const finding of overdue) {
    const payerId = claimById.get(finding.claimId)?.payerId ?? "unknown";
    const bucket = grouped.get(payerId);
    if (bucket) {
      bucket.push(finding);
    } else {
      grouped.set(payerId, [finding]);
      order.push(payerId);
    }
  }

  const total = overdue.reduce((sum, finding) => sum + finding.amountOutstanding, 0);
  lines.push(
    `This note covers ${overdue.length} claim(s) whose payment window has`,
    `closed, totalling ₱${formatPesos(total)} outstanding. Each section cites the`,
    "window that governs the payer. This is a status follow-up, not a demand —",
    "claims under formal investigation are excepted from the cited windows.",
    "",
  );

  for (const payerId of order) {
    const groupFindings = grouped.get(payerId)!;
    const firstClaim = claimById.get(groupFindings[0]!.claimId);
    const payerName = firstClaim?.payerName ?? payerId;
    const rule = paymentRule(payerKindOf(payerId));
    const citation = ruleEvidence(rule);
    const groupTotal = groupFindings.reduce(
      (sum, finding) => sum + finding.amountOutstanding,
      0,
    );

    lines.push(
      `— ${payerName} (${groupFindings.length} claim(s), ₱${formatPesos(groupTotal)} outstanding)`,
      `   Governing window: ${rule.title} — ${rule.ref} (${citation.source}).`,
    );
    groupFindings.forEach((finding, index) => {
      const claim = claimById.get(finding.claimId);
      const label = claim
        ? `${claim.serviceCode} — ${claim.serviceName}`
        : `claim ${finding.claimId}`;
      const submitted = claim ? claim.submittedAt.slice(0, 10) : "unknown";
      lines.push(
        `   ${index + 1}. ${label}`,
        `      Submitted ${submitted}; ${finding.daysOutstanding}d outstanding; ` +
          `window closed ${finding.deadline?.deadline ?? "—"}. ` +
          `Outstanding: ₱${formatPesos(finding.amountOutstanding)}.`,
      );
    });
    lines.push("");
  }

  lines.push(
    `Total outstanding past-window: ₱${formatPesos(total)} across ${overdue.length} claim(s).`,
    APPROVAL_FOOTER,
  );

  return lines.join("\n");
}
