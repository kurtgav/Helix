import { describe, it, expect } from "vitest";
import {
  transition,
  transitionOrThrow,
  canTransition,
  InvalidTransitionError,
} from "./encounterState";

describe("encounterState.transition", () => {
  it("walks the happy path intake -> verifying -> awaiting_approval -> approved", () => {
    const verifying = transition("intake", "start_verification");
    expect(verifying).toEqual({ ok: true, data: "verifying" });

    const awaiting = transition("verifying", "propose");
    expect(awaiting).toEqual({ ok: true, data: "awaiting_approval" });

    const approved = transition("awaiting_approval", "approve");
    expect(approved).toEqual({ ok: true, data: "approved" });
  });

  it("allows rejection from awaiting_approval", () => {
    expect(transition("awaiting_approval", "reject")).toEqual({
      ok: true,
      data: "rejected",
    });
  });

  it("rejects an illegal transition with a Result error (no throw)", () => {
    const result = transition("intake", "approve");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_transition");
    }
  });

  it("cannot approve an already-closed encounter", () => {
    expect(transition("closed", "approve").ok).toBe(false);
  });
});

describe("encounterState.canTransition", () => {
  it("is a pure predicate over the transition table", () => {
    expect(canTransition("awaiting_approval", "approve")).toBe(true);
    expect(canTransition("awaiting_approval", "start_verification")).toBe(false);
    expect(canTransition("intake", "reject")).toBe(false);
  });
});

describe("encounterState.transitionOrThrow", () => {
  it("returns the next status on a legal transition", () => {
    expect(transitionOrThrow("verifying", "propose")).toBe("awaiting_approval");
  });

  it("throws InvalidTransitionError on an illegal transition", () => {
    expect(() => transitionOrThrow("intake", "approve")).toThrow(
      InvalidTransitionError,
    );
  });
});
