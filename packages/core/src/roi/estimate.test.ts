import { describe, it, expect } from "vitest";
import type { Gap } from "@helix/shared";
import {
  DEFAULT_CLAIM_VALUE,
  PH_SERVICE_CLAIM_VALUES,
  estimateClaimValue,
  isDenialPrevented,
} from "./estimate";

describe("estimate.estimateClaimValue", () => {
  it("maps each known PH service code to its baseline claim value", () => {
    // Arrange / Act / Assert — exercise every documented code so a change to the
    // table is caught here (these values feed pesosRecovered directly).
    expect(estimateClaimValue("MRI-BRAIN")).toBe(12000);
    expect(estimateClaimValue("CBC")).toBe(850);
    expect(estimateClaimValue("HD-SESSION")).toBe(4200);
    expect(estimateClaimValue("CONSULT-IM")).toBe(700);
  });

  it("falls back to the default claim value for an unknown service code", () => {
    // Arrange
    const unknownCode = "XRAY-CHEST";
    // Act
    const value = estimateClaimValue(unknownCode);
    // Assert
    expect(value).toBe(DEFAULT_CLAIM_VALUE);
  });

  it("falls back to the default claim value for an empty service code", () => {
    expect(estimateClaimValue("")).toBe(DEFAULT_CLAIM_VALUE);
  });

  it("keeps the getter in lockstep with the source-of-truth table (no drift)", () => {
    // Arrange / Act / Assert — the lookup helper must never diverge from the map.
    for (const [code, value] of Object.entries(PH_SERVICE_CLAIM_VALUES)) {
      expect(estimateClaimValue(code)).toBe(value);
    }
  });
});

describe("estimate.isDenialPrevented", () => {
  const blockingGap: Gap = { kind: "loa", message: "LOA missing", blocking: true };
  const softGap: Gap = { kind: "data", message: "DOB unconfirmed", blocking: false };

  it("is true when at least one gap is blocking", () => {
    // Arrange
    const gaps = [softGap, blockingGap];
    // Act
    const prevented = isDenialPrevented(gaps);
    // Assert
    expect(prevented).toBe(true);
  });

  it("is false when every gap is non-blocking", () => {
    expect(isDenialPrevented([softGap, softGap])).toBe(false);
  });

  it("is false when there are no gaps at all", () => {
    // A clean check with no gaps prevented nothing — it just confirmed eligibility.
    expect(isDenialPrevented([])).toBe(false);
  });
});
