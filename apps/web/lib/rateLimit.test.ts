import { describe, it, expect } from "vitest";
import { evaluateWindow, clientKey, type WindowState } from "./rateLimit";

// evaluateWindow is the pure core of the limiter — no clock, no globals — so the
// full window lifecycle is testable deterministically by injecting nowMs.

describe("evaluateWindow", () => {
  const LIMIT = 3;
  const WINDOW = 60_000;
  const T0 = 1_000_000;

  it("admits the first-ever hit and opens a window", () => {
    // Arrange — no prior state
    const state = undefined;

    // Act
    const result = evaluateWindow(state, T0, LIMIT, WINDOW);

    // Assert
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.next).toEqual({ count: 1, windowStart: T0 });
    expect(result.resetMs).toBe(WINDOW);
  });

  it("admits hits under the limit and counts remaining down", () => {
    // Arrange — second hit inside the window
    const state: WindowState = { count: 1, windowStart: T0 };

    // Act
    const result = evaluateWindow(state, T0 + 5_000, LIMIT, WINDOW);

    // Assert
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(1);
    expect(result.next.count).toBe(2);
    expect(result.resetMs).toBe(WINDOW - 5_000);
  });

  it("blocks the hit that exceeds the limit without incrementing", () => {
    // Arrange — window already at the limit
    const state: WindowState = { count: LIMIT, windowStart: T0 };

    // Act
    const result = evaluateWindow(state, T0 + 10_000, LIMIT, WINDOW);

    // Assert — rejected, budget exhausted, count unchanged
    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.next.count).toBe(LIMIT);
    expect(result.resetMs).toBe(WINDOW - 10_000);
  });

  it("opens a fresh window once the old one has elapsed", () => {
    // Arrange — a maxed-out window that has now expired
    const state: WindowState = { count: LIMIT, windowStart: T0 };

    // Act — exactly one window later
    const result = evaluateWindow(state, T0 + WINDOW, LIMIT, WINDOW);

    // Assert — reset: admitted, count restarts at 1
    expect(result.ok).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.next).toEqual({ count: 1, windowStart: T0 + WINDOW });
  });

  it("does not mutate the input state", () => {
    // Arrange
    const state: WindowState = { count: 1, windowStart: T0 };

    // Act
    evaluateWindow(state, T0 + 1_000, LIMIT, WINDOW);

    // Assert — immutability: original untouched
    expect(state).toEqual({ count: 1, windowStart: T0 });
  });

  it("walks a full sequence: admit up to the limit, then block", () => {
    // Arrange
    let state: WindowState | undefined = undefined;
    const outcomes: boolean[] = [];

    // Act — four hits against a limit of three, same window
    for (let i = 0; i < 4; i++) {
      const result = evaluateWindow(state, T0 + i, LIMIT, WINDOW);
      outcomes.push(result.ok);
      state = result.next;
    }

    // Assert — first three admitted, fourth blocked
    expect(outcomes).toEqual([true, true, true, false]);
  });
});

describe("clientKey", () => {
  it("uses the first hop of x-forwarded-for", () => {
    // Arrange — proxy chain: client, then intermediaries
    const req = new Request("https://helix.test/api/verify", {
      headers: { "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" },
    });

    // Act
    const key = clientKey(req);

    // Assert
    expect(key).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    // Arrange
    const req = new Request("https://helix.test/api/verify", {
      headers: { "x-real-ip": "198.51.100.9" },
    });

    // Act + Assert
    expect(clientKey(req)).toBe("198.51.100.9");
  });

  it("falls back to 'local' when no forwarding headers are present", () => {
    // Arrange — direct localhost hit
    const req = new Request("https://helix.test/api/verify");

    // Act + Assert
    expect(clientKey(req)).toBe("local");
  });
});
