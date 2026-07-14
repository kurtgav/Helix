// Resubmission / appeal drafting — turns triage findings into a professional,
// cited cover note the biller sends with the corrected claims. It lists ONLY the
// recoverable claims (write-offs and dead-ends are excluded from the "to
// resubmit" list), each with its required administrative corrections, and totals
// the pesos in play.
//
// Like the LOA drafter, this is administrative letter text ONLY. It asserts no
// coverage the payer did not already decide and invents NO payer rule — it
// references the corrective fixes and the Helix policy source, nothing more.
// Pure and deterministic.

import type { DenialCase, RevenueCycleFinding } from "@helix/shared";
import { REVENUE_POLICY_SOURCE, formatPesos } from "./triage";

const RESUBMIT_HEADER = "RE: Administrative resubmission / appeal of denied claims";
const APPROVAL_FOOTER =
  "Every resubmission/appeal above requires authorized human approval before it " +
  "is transmitted to the payer.";

/**
 * Draft a cited resubmission / appeal cover note for one batch of findings.
 *
 * Only recoverable findings appear in the body; non-recoverable claims
 * (write-offs, benefit exclusions, duplicates) are intentionally omitted so the
 * note reflects exactly what will be resubmitted. The `cases` are used to enrich
 * each line with the service and payer reference. Deterministic — same findings
 * produce the same text.
 */
export function draftResubmission(
  findings: readonly RevenueCycleFinding[],
  cases: readonly DenialCase[],
): string {
  const caseById = new Map(cases.map((denialCase) => [denialCase.id, denialCase]));
  const recoverable = findings.filter((finding) => finding.recoverable);
  const total = recoverable.reduce((sum, finding) => sum + finding.amountAtRisk, 0);

  const lines: string[] = [RESUBMIT_HEADER, ""];

  // Nothing to resubmit — say so plainly rather than emitting an empty list.
  if (recoverable.length === 0) {
    lines.push(
      "After administrative triage, no claims in this batch were assessed as",
      "recoverable. Recommended disposition (write-off or payer contact) is recorded",
      `per claim. Total recoverable: ₱${formatPesos(0)}.`,
      "",
      `Prepared by Helix (administrative draft, ${REVENUE_POLICY_SOURCE}). No clinical`,
      "determination is made. Requires authorized human approval before any payer action.",
    );
    return lines.join("\n");
  }

  lines.push(
    `This note accompanies ${recoverable.length} claim(s) assessed as administratively`,
    `recoverable, totalling ₱${formatPesos(total)}. Each item lists the corrective`,
    "action required before resubmission. No clinical determination is made;",
    `corrections are administrative and cite Helix policy (${REVENUE_POLICY_SOURCE}).`,
    "",
  );

  recoverable.forEach((finding, index) => {
    const denialCase = caseById.get(finding.caseId);
    const label = denialCase
      ? `${denialCase.serviceCode} — ${denialCase.serviceName} (payer ${denialCase.payerId})`
      : `claim ${finding.caseId}`;
    lines.push(
      `${index + 1}. ${label}`,
      `   Denial reason: ${finding.reason}. Recommended action: ${finding.recommendedAction}.`,
      `   Amount at risk: ₱${formatPesos(finding.amountAtRisk)}. Required corrections:`,
      ...finding.requiredFixes.map((fix) => `     - ${fix}`),
      "",
    );
  });

  lines.push(
    `Total recoverable: ₱${formatPesos(total)} across ${recoverable.length} claim(s).`,
    APPROVAL_FOOTER,
  );

  return lines.join("\n");
}
