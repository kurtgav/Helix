import { describe, it, expect } from "vitest";
import {
  getAdapter,
  listPayerIds,
  NotImplementedError,
  UnknownPayerError,
} from "./registry";

describe("getAdapter", () => {
  it("resolves the mock Maxicare adapter", () => {
    const adapter = getAdapter("maxicare", "mock");
    expect(adapter.payerId).toBe("maxicare");
    expect(adapter.payerName).toContain("Maxicare");
  });

  it("resolves the mock PhilHealth adapter", () => {
    const adapter = getAdapter("philhealth", "mock");
    expect(adapter.payerId).toBe("philhealth");
  });

  it("throws NotImplementedError for live mode (guardrail)", () => {
    expect(() => getAdapter("maxicare", "live")).toThrow(NotImplementedError);
  });

  it("throws UnknownPayerError for an unregistered payer", () => {
    expect(() => getAdapter("acme-health", "mock")).toThrow(UnknownPayerError);
  });

  it("lists the registered payer ids", () => {
    expect(listPayerIds().sort()).toEqual(["maxicare", "philhealth"]);
  });
});
