// Receivables Agent runtime context — the minimal ambient dependencies the
// payer-accountability teammate needs. Mirrors the Revenue Cycle agent's
// context exactly: an actor to authorize, the immutable audit log, an optional
// event bus, and tenant scope. Everything is injected — no hidden globals — so
// a test can pin the inputs and assert exact output.

import type { OrgId } from "@helix/shared";
import type { AgentActor, AgentDeps } from "../context";

/**
 * Context for `runReceivables` and `resolveReceivables`.
 *
 * Reuses the shared {@link AgentActor} and the concrete dependency types from
 * {@link AgentDeps} (audit log + event bus) so the Receivables agent runs on
 * the exact same substrate as Eligibility and Revenue Cycle — same RBAC actor,
 * same audit sink.
 */
export interface ReceivablesContext {
  /** Who is acting — authorized against the RBAC matrix before anything runs. */
  actor: AgentActor;
  /** Immutable, append-only audit log. Only citations + metadata are stored. */
  audit: AgentDeps["audit"];
  /**
   * Optional event bus. Reserved: the substrate's event catalog does not yet
   * define receivables events, so this agent records to the audit log rather
   * than publishing. Kept on the context so wiring stays uniform with other
   * agents and events can be added without a signature change.
   */
  events?: AgentDeps["events"];
  /** Tenant scope stamped onto every audit entry. */
  orgId: OrgId;
}
