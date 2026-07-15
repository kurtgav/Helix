// LOA drafting — turns a resolved requirement set into a Letter of Authorization
// draft. This is administrative letter text ONLY; it makes no clinical claim and
// asserts no coverage the payer adapter did not already cite. Pure.

import type {
  Requirement,
  Gap,
  LOARequest,
  LOAStatus,
  EncounterId,
  PayerId,
  LOARequestId,
} from "@helix/shared";

export interface DraftLOAInput {
  id: LOARequestId;
  encounterId: EncounterId;
  payerId: PayerId;
  payerName: string;
  patientName: string;
  memberId: string;
  planName: string;
  serviceCode: string;
  serviceName: string;
  requirements: readonly Requirement[];
  gaps: readonly Gap[];
  createdAt: string;
  /** Days the issued LOA stays valid (payer policy / rulebook default). */
  loaValidityDays?: number;
}

/** Human-readable list of the documents this LOA requires. */
function requiredDocLabels(requirements: readonly Requirement[]): string[] {
  return requirements
    .filter((req) => req.required)
    .map((req) => req.label);
}

/** Labels of the required documents still missing (drives follow-up). */
function missingDocLabels(requirements: readonly Requirement[]): string[] {
  return requirements
    .filter((req) => req.required && !req.present && req.type !== "loa")
    .map((req) => req.label);
}

/** Compose the draft letter body. Patient-facing text; never fed to the audit log. */
function composeBody(input: DraftLOAInput, missing: readonly string[]): string {
  const lines = [
    `LETTER OF AUTHORIZATION (DRAFT — pending human approval)`,
    ``,
    `To: ${input.payerName}`,
    `Re: Pre-authorization request`,
    ``,
    `Member: ${input.patientName}`,
    `Member ID: ${input.memberId}`,
    `Plan: ${input.planName}`,
    `Service: ${input.serviceCode} — ${input.serviceName}`,
    ``,
    `This letter requests authorization for the service above under the member's`,
    `coverage. Supporting documents required for this request:`,
    ...requiredDocLabels(input.requirements).map((label) => `  - ${label}`),
  ];

  if (missing.length > 0) {
    lines.push(
      ``,
      `Outstanding documents to be collected before submission:`,
      ...missing.map((label) => `  - ${label}`),
    );
  }

  if (input.loaValidityDays !== undefined) {
    lines.push(
      ``,
      `Note: once issued, this authorization is typically valid for ` +
        `${input.loaValidityDays} days per payer policy — schedule the service ` +
        `within that window.`,
    );
  }

  lines.push(
    ``,
    `Prepared by Helix (administrative draft). Requires staff review and`,
    `approval before submission to the payer.`,
  );

  return lines.join("\n");
}

/**
 * Build an immutable LOARequest draft. Status is always "draft" — nothing
 * reaches a payer until a human approves it downstream.
 */
export function draftLOA(input: DraftLOAInput): LOARequest {
  const requiredDocs = requiredDocLabels(input.requirements);
  const missingDocs = missingDocLabels(input.requirements);

  return Object.freeze({
    id: input.id,
    encounterId: input.encounterId,
    payerId: input.payerId,
    serviceCode: input.serviceCode,
    status: "draft" satisfies LOAStatus,
    body: composeBody(input, missingDocs),
    requiredDocs,
    missingDocs,
    createdAt: input.createdAt,
  });
}
