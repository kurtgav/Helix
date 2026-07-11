// Encounter lifecycle state machine. The encounter is the unit an agent acts
// on; its status advances only through explicit, allowed transitions:
//
//   intake -> verifying -> awaiting_approval -> approved | rejected -> closed
//
// Pure and deterministic — no I/O. Illegal transitions fail loudly rather than
// silently landing the encounter in an impossible state.

import { err, ok, type Result, type EncounterStatus } from "@helix/shared";

/** Named events that drive lifecycle transitions. */
export type EncounterEvent =
  | "start_verification"
  | "propose"
  | "approve"
  | "reject"
  | "close";

// Allowed (status, event) -> next status. Anything absent is illegal.
const TRANSITIONS: Readonly<
  Record<EncounterStatus, Partial<Record<EncounterEvent, EncounterStatus>>>
> = Object.freeze({
  intake: { start_verification: "verifying", close: "closed" },
  verifying: { propose: "awaiting_approval", close: "closed" },
  awaiting_approval: { approve: "approved", reject: "rejected" },
  approved: { close: "closed" },
  rejected: { close: "closed" },
  closed: {},
});

/** Pure predicate: is this transition allowed from the current status? */
export function canTransition(
  status: EncounterStatus,
  event: EncounterEvent,
): boolean {
  return TRANSITIONS[status][event] !== undefined;
}

/**
 * Result-returning transition. Returns the next status, or an error describing
 * the illegal transition. No thrown control flow across the boundary.
 */
export function transition(
  status: EncounterStatus,
  event: EncounterEvent,
): Result<EncounterStatus> {
  const next = TRANSITIONS[status][event];
  if (next === undefined) {
    return err({
      code: "invalid_transition",
      message: `Cannot '${event}' an encounter in status '${status}'.`,
      details: { status, event },
    });
  }
  return ok(next);
}

/** Throwing guard for the illegal transition. */
export class InvalidTransitionError extends Error {
  readonly code = "invalid_transition";
  constructor(
    readonly status: EncounterStatus,
    readonly event: EncounterEvent,
  ) {
    super(`Cannot '${event}' an encounter in status '${status}'.`);
    this.name = "InvalidTransitionError";
  }
}

/** Imperative transition: returns the next status or throws. */
export function transitionOrThrow(
  status: EncounterStatus,
  event: EncounterEvent,
): EncounterStatus {
  const result = transition(status, event);
  if (!result.ok) throw new InvalidTransitionError(status, event);
  return result.data;
}
