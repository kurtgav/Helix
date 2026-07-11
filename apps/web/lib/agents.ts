// Server-only seam to the agent layer. ALL PHI + LLM + agent reasoning stays
// behind this module; it is imported only from nodejs route handlers. Nothing
// here is bundled to the client.
//
// It adapts the real @helix/agents API to the two things the web needs — run a
// verification, then record a human decision — and holds the per-encounter
// state that bridges those two stateless HTTP calls. In production that state
// is the encounters + proposed_actions tables; here it is an in-memory map and
// a process-lifetime audit log (synthetic data only).

import { randomUUID } from "node:crypto";
import type {
  IntakeInput,
  ProposedAction,
  ApprovalDecision,
  OrgId,
  UserId,
  EncounterId,
  EncounterStatus,
  ServiceCategory,
  Role,
} from "@helix/shared";
import { MockProvider } from "@helix/llm";
import { InMemoryAuditLog, InMemoryEventBus } from "@helix/core";
import { runEligibility, approve, type EligibilityProposal } from "@helix/agents";
import { DEMO_ORG_ID } from "./demo";
import type { VerifyProposalView, ApproveResultView } from "./api-types";

// One audit trail + event bus per server process (demo). Real deployment: DB.
const audit = new InMemoryAuditLog();
const events = new InMemoryEventBus();

// Single demo actor until the auth substrate lands (task #8). Front desk = staff
// role, which RBAC permits to run eligibility and approve an LOA (not a viewer).
const DEMO_ACTOR: { userId: UserId; role: Role } = {
  userId: "user_demo_frontdesk" as UserId,
  role: "staff",
};

// In mock mode we do not consult a live model. The payer fixture rules are
// authoritative; the LLM is a cross-check, so here it simply echoes the
// adapter's status (parsed from the prompt) — agreeing keeps confidence high
// and the determination is the adapter's, never an invented one.
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

// Server-side encounter store: verify() parks the proposal plus the context
// approve() needs (coverage, service class, lifecycle state), keyed by
// encounterId.
interface ParkedEncounter {
  proposal: ProposedAction<EligibilityProposal>;
  orgId: OrgId;
  coverage: { memberId: string; planName: string };
  serviceCategory: ServiceCategory;
  status: EncounterStatus;
}
const encounters = new Map<string, ParkedEncounter>();

/** Run the Eligibility & Pre-Auth agent for a walk-in; return the client view. */
export async function runEligibilityAction(
  input: IntakeInput,
): Promise<VerifyProposalView> {
  const encounterId = `enc_${randomUUID()}` as EncounterId;

  const action = await runEligibility(input, {
    actor: DEMO_ACTOR,
    audit,
    events,
    orgId: DEMO_ORG_ID,
    encounterId,
    llm: mockCrossCheck(),
  });

  encounters.set(encounterId, {
    proposal: action,
    orgId: DEMO_ORG_ID,
    coverage: {
      memberId: input.coverage.memberId,
      planName: input.coverage.planName,
    },
    serviceCategory: input.service.category,
    status: "awaiting_approval",
  });

  const { eligibility, loa } = action.proposal;
  const loaRequired = eligibility.requirements.some(
    (r) => r.type === "loa" && r.required,
  );

  return {
    kind: action.kind,
    confidence: action.confidence,
    requiresApproval: action.requiresApproval,
    rationale: action.rationale,
    evidence: action.evidence,
    eligibility,
    loaRequired,
    loaDraft: {
      body: loa.body,
      requiredDocs: loa.requiredDocs,
      missingDocs: loa.missingDocs,
    },
    encounterId,
  };
}

export interface ApproveParams {
  encounterId: string;
  decision: "approved" | "rejected";
  editedLoaBody?: string;
  note?: string;
}

/** Record a human approve/reject on a parked encounter (human-in-the-loop). */
export async function approveAction(
  params: ApproveParams,
): Promise<ApproveResultView> {
  const parked = encounters.get(params.encounterId);
  if (!parked) {
    throw new Error("Encounter not found or the decision was already recorded.");
  }

  // Apply a front-desk edit to the drafted LOA before submission, if any.
  const originalBody = parked.proposal.proposal.loa.body;
  const isEdit =
    params.decision === "approved" &&
    typeof params.editedLoaBody === "string" &&
    params.editedLoaBody.trim().length > 0 &&
    params.editedLoaBody !== originalBody;

  const proposal: ProposedAction<EligibilityProposal> = isEdit
    ? {
        ...parked.proposal,
        proposal: {
          ...parked.proposal.proposal,
          loa: { ...parked.proposal.proposal.loa, body: params.editedLoaBody as string },
        },
      }
    : parked.proposal;

  const decision: ApprovalDecision = {
    by: DEMO_ACTOR.userId,
    kind:
      params.decision === "approved" ? (isEdit ? "edited" : "approved") : "rejected",
    at: new Date().toISOString(),
    ...(params.note ? { note: params.note } : {}),
  };

  const result = await approve(proposal, decision, {
    actor: DEMO_ACTOR,
    audit,
    events,
    orgId: parked.orgId,
    encounterId: params.encounterId as EncounterId,
    encounterStatus: parked.status,
    coverage: parked.coverage,
    serviceCategory: parked.serviceCategory,
  });

  encounters.delete(params.encounterId); // one decision per encounter

  return { status: result.loa.status, decision: params.decision };
}
