// Agent runtime context — the ambient dependencies every agent call needs.
// Everything is injected (LLM provider, audit log, clock, id factory) so the
// runtime stays deterministic and offline-testable. No hidden globals.

import type {
  OrgId,
  UserId,
  EncounterId,
  PatientId,
  CoverageId,
  Role,
  AdapterMode,
  RequirementType,
  EncounterStatus,
  ServiceCategory,
} from "@helix/shared";
import type { LLMProvider } from "@helix/llm";
import type { AuditLog, EventBus } from "@helix/core";

/** Who is performing the action — authorized against the RBAC matrix. */
export interface AgentActor {
  userId: UserId;
  role: Role;
}

/** Dependencies shared by every agent entry point. */
export interface AgentDeps {
  actor: AgentActor;
  audit: AuditLog;
  /** Defaults to PAYER_MODE env (or "mock"). "live" throws — guardrail. */
  payerMode?: AdapterMode;
  events?: EventBus;
  /** Injectable clock for deterministic timestamps. Defaults to Date.now. */
  now?: () => Date;
  /** Injectable id factory for deterministic ids. Defaults to randomUUID. */
  newId?: (prefix: string) => string;
}

/** Context for runEligibility. */
export interface EligibilityContext extends AgentDeps {
  orgId: OrgId;
  encounterId: EncounterId;
  patientId?: PatientId;
  coverageId?: CoverageId;
  llm: LLMProvider;
  /**
   * Document kinds already collected for this encounter. The agent reconciles
   * requirement presence against this list — anything required and absent
   * becomes a gap. Absent/empty means nothing has been collected yet.
   */
  presentDocs?: readonly RequirementType[];
}

/** Context for approve(). Carries the encounter's current lifecycle state. */
export interface ApprovalContext extends AgentDeps {
  orgId: OrgId;
  encounterId: EncounterId;
  /** Current encounter status; the state machine advances from here. */
  encounterStatus: EncounterStatus;
  /** Member coverage snapshot required to draft the LOA for submission. */
  coverage: { memberId: string; planName: string };
  /** Administrative service classification carried onto the LOA draft. */
  serviceCategory: ServiceCategory;
}

const VALID_MODES: readonly AdapterMode[] = ["mock", "live"];

/**
 * Resolve the payer adapter mode. Explicit ctx value wins, then PAYER_MODE env,
 * then the safe default "mock". Validated so a typo never silently degrades.
 */
export function resolvePayerMode(
  explicit: AdapterMode | undefined,
  env: Record<string, string | undefined> = process.env,
): AdapterMode {
  const raw = (explicit ?? env.PAYER_MODE ?? "mock").toLowerCase();
  if (!VALID_MODES.includes(raw as AdapterMode)) {
    throw new Error(
      `Invalid PAYER_MODE "${raw}". Expected "mock" or "live".`,
    );
  }
  return raw as AdapterMode;
}

/** ISO timestamp from the injected clock (or wall clock). */
export function nowIso(deps: Pick<AgentDeps, "now">): string {
  return (deps.now?.() ?? new Date()).toISOString();
}
