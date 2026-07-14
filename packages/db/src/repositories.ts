// Typed persistence for the eligibility/approval flow. Org-scoped, injection-safe
// (Drizzle typed queries only), no PHI in thrown errors. The domain uses string
// payer keys ("maxicare"); the schema uses uuid PKs, so payer keys map to stable
// deterministic uuids here (bidirectional) — no schema change required.

import { desc, eq } from "drizzle-orm";
import type {
  CoverageStatus,
  EligibilityResult,
  Evidence,
  Gap,
  LOARequest,
  LOAStatus,
  PayerKind,
  ProposedAction,
  Requirement,
  ServiceCategory,
  Sex,
  EncounterStatus,
} from "@helix/shared";
import { getDb } from "./client";
import {
  coverage,
  eligibilityChecks,
  encounters,
  loaRequests,
  orgs,
  patients,
  payers,
  services,
} from "./schema";

/** The v0 single-tenant demo org (uuid form of the mock DEMO_ORG_ID). */
export const DEMO_ORG_UUID = "00000000-0000-4000-8000-0000000000aa";

// Known payers → stable uuid + metadata. Bidirectional so approve() can recover
// the payer KEY (which the adapter registry needs) from a persisted uuid.
const PAYER_META: Record<string, { uuid: string; name: string; kind: PayerKind }> = {
  maxicare: { uuid: "00000000-0000-4000-8000-000000000001", name: "Maxicare", kind: "hmo" },
  philhealth: { uuid: "00000000-0000-4000-8000-000000000002", name: "PhilHealth", kind: "philhealth" },
  intellicare: { uuid: "00000000-0000-4000-8000-000000000003", name: "Intellicare", kind: "hmo" },
  medicard: { uuid: "00000000-0000-4000-8000-000000000004", name: "Medicard", kind: "hmo" },
};
const UUID_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(PAYER_META).map(([key, m]) => [m.uuid, key]),
);

export function payerUuid(key: string): string {
  const meta = PAYER_META[key];
  if (!meta) throw new Error(`Unknown payer key: ${key}`);
  return meta.uuid;
}
export function payerKeyFromUuid(uuid: string): string {
  const key = UUID_TO_KEY[uuid];
  if (!key) throw new Error("Unknown payer uuid");
  return key;
}

/** Idempotently ensure the demo org, all known payers, and a service exist. */
export async function bootstrapDemo(orgName: string, service: {
  code: string;
  name: string;
  category: ServiceCategory;
}): Promise<void> {
  const db = getDb();
  await db.insert(orgs).values({ id: DEMO_ORG_UUID, name: orgName }).onConflictDoNothing();
  for (const meta of Object.values(PAYER_META)) {
    await db
      .insert(payers)
      .values({ id: meta.uuid, name: meta.name, kind: meta.kind, mode: "mock" })
      .onConflictDoNothing();
  }
  await db
    .insert(services)
    .values({ code: service.code, name: service.name, category: service.category })
    .onConflictDoNothing();
}

export async function createPatient(input: {
  fullName: string;
  birthDate: string;
  sex: Sex;
}): Promise<string> {
  const [row] = await getDb()
    .insert(patients)
    .values({ orgId: DEMO_ORG_UUID, fullName: input.fullName, birthDate: input.birthDate, sex: input.sex })
    .returning({ id: patients.id });
  return row!.id;
}

export async function createCoverage(input: {
  patientId: string;
  payerKey: string;
  memberId: string;
  planName: string;
  status?: CoverageStatus;
}): Promise<string> {
  const [row] = await getDb()
    .insert(coverage)
    .values({
      patientId: input.patientId,
      payerId: payerUuid(input.payerKey),
      memberId: input.memberId,
      planName: input.planName,
      status: input.status ?? "unknown",
    })
    .returning({ id: coverage.id });
  return row!.id;
}

export async function createEncounter(input: {
  patientId: string;
  coverageId: string;
  serviceCode: string;
  status: EncounterStatus;
}): Promise<string> {
  const [row] = await getDb()
    .insert(encounters)
    .values({
      orgId: DEMO_ORG_UUID,
      patientId: input.patientId,
      coverageId: input.coverageId,
      serviceCode: input.serviceCode,
      status: input.status,
    })
    .returning({ id: encounters.id });
  return row!.id;
}

export async function updateEncounterStatus(id: string, status: EncounterStatus): Promise<void> {
  await getDb().update(encounters).set({ status }).where(eq(encounters.id, id));
}

export async function saveEligibilityCheck(
  encounterId: string,
  e: EligibilityResult,
  durationMs?: number,
): Promise<void> {
  await getDb().insert(eligibilityChecks).values({
    encounterId,
    status: e.status,
    benefit: e.benefit ?? null,
    requirements: e.requirements,
    gaps: e.gaps,
    evidence: e.evidence,
    // Whole milliseconds; sub-ms noise adds nothing to an ROI average.
    durationMs: durationMs === undefined ? null : Math.max(0, Math.round(durationMs)),
    checkedAt: new Date(e.checkedAt),
  });
}

export async function saveLoaRequest(encounterId: string, loa: LOARequest): Promise<void> {
  await getDb().insert(loaRequests).values({
    encounterId,
    payerId: payerUuid(loa.payerId),
    serviceCode: loa.serviceCode,
    status: loa.status,
    body: loa.body,
    requiredDocs: loa.requiredDocs,
    missingDocs: loa.missingDocs,
  });
}

export async function updateLoaByEncounter(
  encounterId: string,
  status: LOAStatus,
  body?: string,
): Promise<void> {
  await getDb()
    .update(loaRequests)
    .set(body !== undefined ? { status, body } : { status })
    .where(eq(loaRequests.encounterId, encounterId));
}

type ReconstructedProposal = ProposedAction<{ eligibility: EligibilityResult; loa: LOARequest }>;

/** Rebuild the ProposedAction approve() needs from the persisted rows. */
export async function loadProposalByEncounter(
  encounterId: string,
): Promise<ReconstructedProposal | null> {
  const db = getDb();
  const [check] = await db
    .select()
    .from(eligibilityChecks)
    .where(eq(eligibilityChecks.encounterId, encounterId))
    .orderBy(desc(eligibilityChecks.checkedAt))
    .limit(1);
  const [loaRow] = await db
    .select()
    .from(loaRequests)
    .where(eq(loaRequests.encounterId, encounterId))
    .orderBy(desc(loaRequests.createdAt))
    .limit(1);
  if (!check || !loaRow) return null;

  const eligibility: EligibilityResult = {
    status: check.status,
    ...(check.benefit ? { benefit: check.benefit } : {}),
    requirements: (check.requirements ?? []) as Requirement[],
    gaps: (check.gaps ?? []) as Gap[],
    evidence: (check.evidence ?? []) as Evidence[],
    checkedAt: check.checkedAt.toISOString(),
  };
  const loa: LOARequest = {
    id: loaRow.id as LOARequest["id"],
    encounterId: encounterId as LOARequest["encounterId"],
    payerId: payerKeyFromUuid(loaRow.payerId) as LOARequest["payerId"],
    serviceCode: loaRow.serviceCode,
    status: loaRow.status,
    body: loaRow.body,
    requiredDocs: (loaRow.requiredDocs ?? []) as string[],
    missingDocs: (loaRow.missingDocs ?? []) as string[],
    createdAt: loaRow.createdAt.toISOString(),
  };

  return {
    kind: "eligibility.result",
    proposal: { eligibility, loa },
    evidence: eligibility.evidence,
    confidence: 1,
    requiresApproval: true,
    rationale: "Reconstructed from persisted eligibility check and LOA draft.",
  };
}

/** The context approve() needs: coverage snapshot, service class, lifecycle. */
export async function loadEncounterContext(encounterId: string): Promise<{
  memberId: string;
  planName: string;
  serviceCategory: ServiceCategory;
  encounterStatus: EncounterStatus;
} | null> {
  const db = getDb();
  const [enc] = await db
    .select({
      coverageId: encounters.coverageId,
      serviceCode: encounters.serviceCode,
      status: encounters.status,
    })
    .from(encounters)
    .where(eq(encounters.id, encounterId))
    .limit(1);
  if (!enc) return null;
  const [cov] = await db
    .select({ memberId: coverage.memberId, planName: coverage.planName })
    .from(coverage)
    .where(eq(coverage.id, enc.coverageId))
    .limit(1);
  const [svc] = await db
    .select({ category: services.category })
    .from(services)
    .where(eq(services.code, enc.serviceCode))
    .limit(1);
  if (!cov || !svc) return null;
  return {
    memberId: cov.memberId,
    planName: cov.planName,
    serviceCategory: svc.category,
    encounterStatus: enc.status,
  };
}
