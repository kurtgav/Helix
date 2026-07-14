// Server-only seam to the agent layer. ALL PHI + LLM + agent reasoning stays
// behind this module; imported only from nodejs route handlers. Never bundled to
// the client.
//
// Two interchangeable backends behind the same functions:
//   • DATABASE_URL set  -> Postgres (Supabase): encounters/checks/LOAs/audit persist.
//   • otherwise         -> in-memory (the demo/offline fallback, resets per run).
// Both preserve the human-approval gate, the mock LLM cross-check, and no-PHI-in-logs.

import { randomUUID } from "node:crypto";
import type {
  IntakeInput,
  ProposedAction,
  ApprovalDecision,
  OrgId,
  EncounterId,
  EncounterStatus,
  ServiceCategory,
  RoiSnapshot,
} from "@helix/shared";
import { MockProvider } from "@helix/llm";
import { InMemoryAuditLog, InMemoryEventBus } from "@helix/core";
import { runEligibility, approve, type EligibilityProposal } from "@helix/agents";
import {
  hasDatabase,
  createBufferedAuditLog,
  bootstrapDemo,
  createPatient,
  createCoverage,
  createEncounter,
  updateEncounterStatus,
  saveEligibilityCheck,
  saveLoaRequest,
  updateLoaByEncounter,
  loadProposalByEncounter,
  loadEncounterContext,
  computeRoiFromDb,
  DEMO_ORG_UUID,
} from "@helix/db";
import { DEMO_ORG_ID, DEMO_ORG_NAME, demoRoiSnapshot } from "./demo";
import { requireActor } from "./auth";
import type { VerifyProposalView, ApproveResultView } from "./api-types";

// In-memory fallback state must be a process-wide singleton. Next bundles each
// route handler (/api/verify, /api/approve) separately, so a plain module-level
// value is duplicated per route and NOT shared — an encounter parked by verify
// would be invisible to approve. Stashing on globalThis gives one shared
// instance across all route bundles, and also survives dev HMR module reloads.
interface HelixMemState {
  events: InMemoryEventBus;
  audit: InMemoryAuditLog;
  parked: Map<string, ParkedEncounter>;
}
const globalForHelix = globalThis as unknown as { __helixMem?: HelixMemState };
const mem: HelixMemState = (globalForHelix.__helixMem ??= {
  events: new InMemoryEventBus(),
  audit: new InMemoryAuditLog(),
  parked: new Map<string, ParkedEncounter>(),
});
const events = mem.events;
const memAudit = mem.audit;

// The acting user is resolved from the session (auth substrate). requireActor()
// reads {userId, role} from the request cookie via @/lib/auth — default is
// front-desk staff, matching the prior demo actor. RBAC then enforces per role,
// so a viewer session is blocked end to end (route 403 + agent assertCan), not
// merely hidden in the UI.

// In mock mode we don't consult a live model. Payer fixture rules are
// authoritative; the LLM echoes the adapter's status (parsed from the prompt),
// keeping confidence high and the determination the adapter's, never invented.
function mockCrossCheck(): MockProvider {
  return new MockProvider({
    respondJson: (req) => {
      const m = req.prompt.match(/status=(eligible|ineligible|needs_review)/);
      const status = m?.[1] ?? "needs_review";
      return {
        status,
        benefit: "Administrative determination from payer fixture rules (mock mode).",
        requirements: [],
        gaps: [],
        evidence: [
          {
            source: "mock:cross-check",
            ref: "#status",
            snippet: "Offline mock echoes the adapter determination.",
          },
        ],
        checkedAt: "2026-07-01T00:00:00.000Z",
      };
    },
  });
}

function loaRequiredFrom(action: ProposedAction<EligibilityProposal>): boolean {
  return action.proposal.eligibility.requirements.some(
    (r) => r.type === "loa" && r.required,
  );
}

function toView(
  action: ProposedAction<EligibilityProposal>,
  encounterId: string,
): VerifyProposalView {
  const { eligibility, loa } = action.proposal;
  return {
    kind: action.kind,
    confidence: action.confidence,
    requiresApproval: action.requiresApproval,
    rationale: action.rationale,
    evidence: action.evidence,
    eligibility,
    loaRequired: loaRequiredFrom(action),
    loaDraft: { body: loa.body, requiredDocs: loa.requiredDocs, missingDocs: loa.missingDocs },
    encounterId,
  };
}

// --- in-memory fallback state ---
interface ParkedEncounter {
  proposal: ProposedAction<EligibilityProposal>;
  orgId: OrgId;
  coverage: { memberId: string; planName: string };
  serviceCategory: ServiceCategory;
  status: EncounterStatus;
}
const parked = mem.parked;

// ---------------------------------------------------------------------------
export function runEligibilityAction(input: IntakeInput): Promise<VerifyProposalView> {
  return hasDatabase() ? runDb(input) : runMock(input);
}

async function runDb(input: IntakeInput): Promise<VerifyProposalView> {
  const actor = requireActor();
  await bootstrapDemo(DEMO_ORG_NAME, input.service);
  const patientId = await createPatient(input.patient);
  const coverageId = await createCoverage({
    patientId,
    payerKey: input.coverage.payerId,
    memberId: input.coverage.memberId,
    planName: input.coverage.planName,
  });
  const encounterId = await createEncounter({
    patientId,
    coverageId,
    serviceCode: input.service.code,
    status: "intake",
  });

  const audit = createBufferedAuditLog();
  // Measure the agent run wall-clock so avg time-to-verify on the dashboard is
  // measured, not assumed (persisted per check as eligibility_checks.duration_ms).
  const startedAtMs = Date.now();
  const action = await runEligibility(input, {
    actor,
    audit,
    events,
    orgId: DEMO_ORG_UUID as OrgId,
    encounterId: encounterId as EncounterId,
    llm: mockCrossCheck(),
  });
  const durationMs = Date.now() - startedAtMs;

  const { eligibility, loa } = action.proposal;
  await saveEligibilityCheck(encounterId, eligibility, durationMs);
  await saveLoaRequest(encounterId, loa);
  await updateEncounterStatus(encounterId, "awaiting_approval");
  await audit.flush();

  return toView(action, encounterId);
}

async function runMock(input: IntakeInput): Promise<VerifyProposalView> {
  const actor = requireActor();
  const encounterId = `enc_${randomUUID()}`;
  const action = await runEligibility(input, {
    actor,
    audit: memAudit,
    events,
    orgId: DEMO_ORG_ID,
    encounterId: encounterId as EncounterId,
    llm: mockCrossCheck(),
  });
  parked.set(encounterId, {
    proposal: action,
    orgId: DEMO_ORG_ID,
    coverage: { memberId: input.coverage.memberId, planName: input.coverage.planName },
    serviceCategory: input.service.category,
    status: "awaiting_approval",
  });
  return toView(action, encounterId);
}

// ---------------------------------------------------------------------------
export interface ApproveParams {
  encounterId: string;
  decision: "approved" | "rejected";
  editedLoaBody?: string;
  note?: string;
}

export function approveAction(params: ApproveParams): Promise<ApproveResultView> {
  return hasDatabase() ? approveDb(params) : approveMock(params);
}

function buildDecision(
  params: ApproveParams,
  isEdit: boolean,
  actorId: ApprovalDecision["by"],
): ApprovalDecision {
  return {
    by: actorId,
    kind: params.decision === "approved" ? (isEdit ? "edited" : "approved") : "rejected",
    at: new Date().toISOString(),
    ...(params.note ? { note: params.note } : {}),
  };
}

function withEditedBody(
  proposal: ProposedAction<EligibilityProposal>,
  body: string,
): ProposedAction<EligibilityProposal> {
  return {
    ...proposal,
    proposal: {
      ...proposal.proposal,
      loa: { ...proposal.proposal.loa, body },
    },
  };
}

async function approveDb(params: ApproveParams): Promise<ApproveResultView> {
  const actor = requireActor();
  const proposal = await loadProposalByEncounter(params.encounterId);
  const ctx = await loadEncounterContext(params.encounterId);
  if (!proposal || !ctx) {
    throw new Error("Encounter not found or the decision was already recorded.");
  }
  const originalBody = proposal.proposal.loa.body;
  const isEdit =
    params.decision === "approved" &&
    typeof params.editedLoaBody === "string" &&
    params.editedLoaBody.trim().length > 0 &&
    params.editedLoaBody !== originalBody;
  const finalProposal = isEdit ? withEditedBody(proposal, params.editedLoaBody as string) : proposal;

  const audit = createBufferedAuditLog();
  const result = await approve(finalProposal, buildDecision(params, isEdit, actor.userId), {
    actor,
    audit,
    events,
    orgId: DEMO_ORG_UUID as OrgId,
    encounterId: params.encounterId as EncounterId,
    encounterStatus: ctx.encounterStatus,
    coverage: { memberId: ctx.memberId, planName: ctx.planName },
    serviceCategory: ctx.serviceCategory,
  });

  await updateLoaByEncounter(
    params.encounterId,
    result.loa.status,
    isEdit ? (params.editedLoaBody as string) : undefined,
  );
  await updateEncounterStatus(params.encounterId, result.encounterStatus);
  await audit.flush();

  return { status: result.loa.status, decision: params.decision };
}

async function approveMock(params: ApproveParams): Promise<ApproveResultView> {
  const actor = requireActor();
  const entry = parked.get(params.encounterId);
  if (!entry) {
    throw new Error("Encounter not found or the decision was already recorded.");
  }
  const originalBody = entry.proposal.proposal.loa.body;
  const isEdit =
    params.decision === "approved" &&
    typeof params.editedLoaBody === "string" &&
    params.editedLoaBody.trim().length > 0 &&
    params.editedLoaBody !== originalBody;
  const finalProposal = isEdit
    ? withEditedBody(entry.proposal, params.editedLoaBody as string)
    : entry.proposal;

  const result = await approve(finalProposal, buildDecision(params, isEdit, actor.userId), {
    actor,
    audit: memAudit,
    events,
    orgId: entry.orgId,
    encounterId: params.encounterId as EncounterId,
    encounterStatus: entry.status,
    coverage: entry.coverage,
    serviceCategory: entry.serviceCategory,
  });

  parked.delete(params.encounterId);
  return { status: result.loa.status, decision: params.decision };
}

// ---------------------------------------------------------------------------
// Dashboard ROI — LIVE from persisted rows when a database is configured, else
// the seeded demo baseline. Closes the iteration-5 gap where real encounters
// persisted but never reached the ROI panel. On any DB read error we fall back
// to the demo snapshot (mock is the bulletproof default) and log without PHI,
// so the dashboard never hard-fails.
export async function getDashboardRoi(): Promise<{ roi: RoiSnapshot; live: boolean }> {
  if (!hasDatabase()) return { roi: demoRoiSnapshot(), live: false };
  try {
    const now = new Date();
    const windowStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();
    const windowEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    ).toISOString();
    const roi = await computeRoiFromDb(DEMO_ORG_UUID, {
      orgId: DEMO_ORG_UUID as OrgId,
      windowStart,
      windowEnd,
    });
    return { roi, live: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[dashboard] live ROI read failed, using demo baseline:", message);
    return { roi: demoRoiSnapshot(), live: false };
  }
}
