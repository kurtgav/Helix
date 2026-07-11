// @helix/agents — the Eligibility & Pre-Auth Agent runtime (v0's heart).
// Deterministic rules + cited payer adapters + a re-validated LLM determination,
// gated by RBAC and human approval, with an immutable audit trail. Administrative
// only: no clinical reasoning, no invented payer rules.

// --- Eligibility agent ---
export {
  runEligibility,
  scoreConfidence,
  ELIGIBILITY_ACTION_KIND,
  type EligibilityProposal,
} from "./eligibilityAgent";

// --- Approval service ---
export { approve, APPROVAL_ACTION, type ApprovalResult } from "./approvalService";

// --- Rule engine ---
export {
  resolveRequirements,
  mergeRequirements,
  reconcilePresence,
  serviceRequiresLOA,
  detectMissingDocGaps,
  LOCAL_BASELINE,
  LOCAL_POLICY_SOURCE,
} from "./rules";

// --- LOA drafting ---
export { draftLOA, type DraftLOAInput } from "./loa";

// --- Evidence / audit hygiene ---
export { citationsOnly } from "./evidence";

// --- Encounter state machine ---
export {
  transition,
  transitionOrThrow,
  canTransition,
  InvalidTransitionError,
  type EncounterEvent,
} from "./encounterState";

// --- Context contracts ---
export {
  resolvePayerMode,
  nowIso,
  type AgentActor,
  type AgentDeps,
  type EligibilityContext,
  type ApprovalContext,
} from "./context";
