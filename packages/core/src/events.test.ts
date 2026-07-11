import { describe, it, expect, vi } from "vitest";
import type { OrgId, EncounterId } from "@helix/shared";
import { InMemoryEventBus, type HelixEvent } from "./events";

const ORG = "org_1" as OrgId;
const ENC = "enc_1" as EncounterId;

function encounterCreated(): HelixEvent {
  return {
    id: "evt_1",
    type: "encounter.created",
    orgId: ORG,
    at: "2026-07-12T09:00:00.000Z",
    payload: { encounterId: ENC },
  };
}

describe("events.InMemoryEventBus", () => {
  it("delivers an event to a type-specific subscriber", () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();
    bus.subscribe("encounter.created", handler);
    bus.publish(encounterCreated());
    expect(handler).toHaveBeenCalledOnce();
    expect(handler.mock.calls[0]![0].payload.encounterId).toBe(ENC);
  });

  it("does not deliver to subscribers of other types", () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();
    bus.subscribe("loa.submitted", handler);
    bus.publish(encounterCreated());
    expect(handler).not.toHaveBeenCalled();
  });

  it("delivers every event to wildcard subscribers", () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();
    bus.subscribeAll(handler);
    bus.publish(encounterCreated());
    expect(handler).toHaveBeenCalledOnce();
  });

  it("stops delivering after unsubscribe", () => {
    const bus = new InMemoryEventBus();
    const handler = vi.fn();
    const off = bus.subscribe("encounter.created", handler);
    off();
    bus.publish(encounterCreated());
    expect(handler).not.toHaveBeenCalled();
  });

  it("keeps dispatching to other handlers when one throws, then surfaces the error", () => {
    const bus = new InMemoryEventBus();
    const good = vi.fn();
    bus.subscribe("encounter.created", () => {
      throw new Error("boom");
    });
    bus.subscribeAll(good);
    expect(() => bus.publish(encounterCreated())).toThrow("boom");
    // The healthy handler still ran despite the earlier throw.
    expect(good).toHaveBeenCalledOnce();
  });

  it("routes handler errors to a custom onError instead of throwing", () => {
    const onError = vi.fn();
    const bus = new InMemoryEventBus(onError);
    bus.subscribe("encounter.created", () => {
      throw new Error("boom");
    });
    expect(() => bus.publish(encounterCreated())).not.toThrow();
    expect(onError).toHaveBeenCalledOnce();
  });
});
