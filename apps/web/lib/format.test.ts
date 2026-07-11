import { describe, it, expect } from "vitest";
import { formatPesos, formatHours, formatDuration } from "./format";

describe("formatPesos", () => {
  it("formats whole pesos with grouping and the ₱ symbol", () => {
    expect(formatPesos(12000)).toBe("₱12,000");
  });

  it("rounds fractional pesos to whole", () => {
    expect(formatPesos(1499.6)).toBe("₱1,500");
  });

  it("collapses negative and non-finite amounts to ₱0", () => {
    expect(formatPesos(-5)).toBe("₱0");
    expect(formatPesos(Number.NaN)).toBe("₱0");
  });
});

describe("formatHours", () => {
  it("uses singular unit for exactly one hour", () => {
    expect(formatHours(1)).toBe("1 hr");
  });

  it("keeps one decimal place when needed", () => {
    expect(formatHours(22.5)).toBe("22.5 hrs");
  });

  it("drops the decimal for whole hours", () => {
    expect(formatHours(22)).toBe("22 hrs");
  });

  it("handles zero and negatives safely", () => {
    expect(formatHours(0)).toBe("0 hrs");
    expect(formatHours(-3)).toBe("0 hrs");
  });
});

describe("formatDuration", () => {
  it("renders sub-second values in ms", () => {
    expect(formatDuration(420)).toBe("420ms");
  });

  it("renders seconds with a trimmed decimal", () => {
    expect(formatDuration(2000)).toBe("2s");
    expect(formatDuration(2500)).toBe("2.5s");
  });

  it("renders minutes and seconds", () => {
    expect(formatDuration(90_000)).toBe("1m 30s");
  });

  it("returns 0s for non-positive input", () => {
    expect(formatDuration(0)).toBe("0s");
  });
});
