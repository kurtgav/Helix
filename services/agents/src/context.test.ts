import { describe, it, expect } from "vitest";
import { resolvePayerMode, nowIso } from "./context";

// resolvePayerMode is the PAYER_MODE guard: it decides whether business logic
// resolves a mock or (blocked) live adapter. A typo must fail loudly rather
// than silently degrade. See brain/security-and-compliance + ph-payer-landscape.
describe("resolvePayerMode", () => {
  it("defaults to mock when nothing is set", () => {
    expect(resolvePayerMode(undefined, {})).toBe("mock");
  });

  it("honours an explicit value over the environment", () => {
    expect(resolvePayerMode("mock", { PAYER_MODE: "live" })).toBe("mock");
  });

  it("reads PAYER_MODE from the environment when no explicit value is given", () => {
    expect(resolvePayerMode(undefined, { PAYER_MODE: "live" })).toBe("live");
  });

  it("is case-insensitive", () => {
    expect(resolvePayerMode(undefined, { PAYER_MODE: "LIVE" })).toBe("live");
    expect(resolvePayerMode(undefined, { PAYER_MODE: "Mock" })).toBe("mock");
  });

  it("throws loudly on an invalid mode rather than degrading silently", () => {
    expect(() => resolvePayerMode(undefined, { PAYER_MODE: "prod" })).toThrow(
      /Invalid PAYER_MODE/,
    );
    expect(() =>
      resolvePayerMode("staging" as unknown as "mock", {}),
    ).toThrow(/Invalid PAYER_MODE/);
  });

  it("does not leak a secret-looking value verbatim beyond the quoted echo", () => {
    // The error names the bad value so an operator can fix config; that value is
    // an operator-supplied mode string, never PHI.
    try {
      resolvePayerMode(undefined, { PAYER_MODE: "oops" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('"oops"');
    }
  });
});

describe("nowIso", () => {
  it("uses the injected clock for deterministic timestamps", () => {
    const fixed = new Date("2026-07-12T00:00:00.000Z");
    expect(nowIso({ now: () => fixed })).toBe("2026-07-12T00:00:00.000Z");
  });

  it("falls back to the wall clock when no clock is injected", () => {
    const iso = nowIso({});
    expect(() => new Date(iso).toISOString()).not.toThrow();
    expect(iso).toBe(new Date(iso).toISOString());
  });
});
