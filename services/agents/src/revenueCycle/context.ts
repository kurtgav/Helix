// Revenue Cycle Agent runtime context — the minimal ambient dependencies the
// denial-triage teammate needs. It deliberately mirrors the Eligibility agent's
// context but carries ONLY what denial triage uses: an actor to authorize, the
// immutable audit log, an optional event bus, and injectable clock/id factory
// for deterministic, offline-testable runs. Everything is injected — no hidden
// globals — so a test can pin the clock and ids and assert exact output.

import type { OrgId } from "@helix/shared";
import type { AgentActor, AgentDeps } from "../context";

/**
 * Context for `runRevenueCycle` and `resolveRevenueCycle`.
 *
 * Reuses the shared {@link AgentActor} and the concrete dependency types from
 * {@link AgentDeps} (audit log + event bus) so the Revenue Cycle agent runs on
 * the exact same substrate as Eligibility — same RBAC actor, same audit sink.
 */
export interface RevenueCycleContext {
  /** Who is acting — authorized against the RBAC matrix before anything runs. */
  actor: AgentActor;
  /** Immutable, append-only audit log. Only citations + metadata are stored. */
  audit: AgentDeps["audit"];
  /**
   * Optional event bus. Reserved: the substrate's event catalog does not yet
   * define revenue-cycle events, so this agent records to the audit log rather
   * than publishing. Kept on the context so wiring stays uniform with other
   * agents and events can be added without a signature change.
   */
  events?: AgentDeps["events"];
  /** Tenant scope stamped onto every audit entry. */
  orgId: OrgId;
  /** Injectable clock for deterministic timestamps. Defaults to the wall clock. */
  now?: () => Date;
  /** Injectable id factory for deterministic ids. Defaults to randomUUID. */
  newId?: (prefix: string) => string;
}
