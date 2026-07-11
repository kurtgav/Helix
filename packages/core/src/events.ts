// Events — typed domain events + an in-memory bus. Agent runs, approvals, and
// status changes emit events that power ROI metrics, the Executive Agent, and
// future multi-agent coordination. See brain/system-architecture: "Event-driven".

import type { OrgId, EncounterId, UserId, ApprovalDecisionKind } from "@helix/shared";

// --- Event catalog -------------------------------------------------------

export interface DomainEvent<TType extends string, TPayload> {
  id: string;
  type: TType;
  orgId: OrgId;
  at: string; // ISO timestamp
  payload: TPayload;
}

export type EncounterCreatedEvent = DomainEvent<
  "encounter.created",
  { encounterId: EncounterId }
>;

export type EligibilityCheckedEvent = DomainEvent<
  "eligibility.checked",
  { encounterId: EncounterId; status: string; durationMs: number }
>;

export type LoaDraftedEvent = DomainEvent<
  "loa.drafted",
  { encounterId: EncounterId; serviceCode: string }
>;

export type LoaSubmittedEvent = DomainEvent<
  "loa.submitted",
  { encounterId: EncounterId; serviceCode: string }
>;

export type ApprovalRequestedEvent = DomainEvent<
  "approval.requested",
  { encounterId: EncounterId; actionKind: string }
>;

export type ApprovalDecidedEvent = DomainEvent<
  "approval.decided",
  { encounterId: EncounterId; actionKind: string; decision: ApprovalDecisionKind; by: UserId }
>;

// Discriminated union of every event the substrate publishes.
export type HelixEvent =
  | EncounterCreatedEvent
  | EligibilityCheckedEvent
  | LoaDraftedEvent
  | LoaSubmittedEvent
  | ApprovalRequestedEvent
  | ApprovalDecidedEvent;

export type HelixEventType = HelixEvent["type"];

// Narrow a HelixEvent to the variant matching a given type literal.
export type EventOf<T extends HelixEventType> = Extract<HelixEvent, { type: T }>;

// --- Bus -----------------------------------------------------------------

export type EventHandler<E extends HelixEvent = HelixEvent> = (event: E) => void;

/** Called and returned by subscribe to detach a handler. */
export type Unsubscribe = () => void;

export interface EventBus {
  publish(event: HelixEvent): void;
  subscribe<T extends HelixEventType>(type: T, handler: EventHandler<EventOf<T>>): Unsubscribe;
  subscribeAll(handler: EventHandler): Unsubscribe;
}

/**
 * Synchronous in-memory bus for dev, tests, and the demo slice. Handlers run
 * in registration order; type-specific handlers fire before wildcard ones.
 * A throwing handler does not silently break the rest — its error is routed
 * to `onError` (which, by default, rethrows after the remaining handlers run).
 */
export class InMemoryEventBus implements EventBus {
  #handlers = new Map<HelixEventType, Set<EventHandler>>();
  #wildcard = new Set<EventHandler>();
  #onError: (error: unknown, event: HelixEvent) => void;

  constructor(onError?: (error: unknown, event: HelixEvent) => void) {
    // Default policy: never swallow. Collected errors rethrow after dispatch.
    this.#onError =
      onError ??
      ((error) => {
        throw error;
      });
  }

  publish(event: HelixEvent): void {
    const typed = this.#handlers.get(event.type);
    const targets: EventHandler[] = [
      ...(typed ? [...typed] : []),
      ...this.#wildcard,
    ];

    let firstError: { error: unknown } | undefined;
    for (const handler of targets) {
      try {
        handler(event);
      } catch (error) {
        // Explicit handling: capture, keep dispatching, surface at the end.
        if (firstError === undefined) firstError = { error };
      }
    }
    if (firstError !== undefined) {
      this.#onError(firstError.error, event);
    }
  }

  subscribe<T extends HelixEventType>(
    type: T,
    handler: EventHandler<EventOf<T>>,
  ): Unsubscribe {
    const set = this.#handlers.get(type) ?? new Set<EventHandler>();
    set.add(handler as EventHandler);
    this.#handlers.set(type, set);
    return () => {
      set.delete(handler as EventHandler);
    };
  }

  subscribeAll(handler: EventHandler): Unsubscribe {
    this.#wildcard.add(handler);
    return () => {
      this.#wildcard.delete(handler);
    };
  }
}
