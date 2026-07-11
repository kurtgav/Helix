import { describe, it, expect } from "vitest";
import {
  requiresApproval,
  isOutboundAction,
  STRICT_APPROVAL_POLICY,
  type ApprovalPolicy,
} from "./approval";

describe("approval.isOutboundAction", () => {
  it("flags payer + patient-facing actions as outbound", () => {
    expect(isOutboundAction("loa.submit")).toBe(true);
    expect(isOutboundAction("payer.submit")).toBe(true);
    expect(isOutboundAction("patient.message")).toBe(true);
  });

  it("treats internal actions as not outbound", () => {
    expect(isOutboundAction("eligibility.result")).toBe(false);
    expect(isOutboundAction("loa.draft")).toBe(false);
  });
});

describe("approval.requiresApproval", () => {
  it("ALWAYS requires approval for outbound actions, even if policy tries to auto-approve", () => {
    const permissivePolicy: ApprovalPolicy = {
      autoApproveKinds: ["loa.submit", "patient.message"],
    };
    expect(requiresApproval("loa.submit", permissivePolicy)).toBe(true);
    expect(requiresApproval("patient.message", permissivePolicy)).toBe(true);
  });

  it("defaults to requiring approval when no policy is supplied", () => {
    expect(requiresApproval("loa.draft")).toBe(true);
    expect(requiresApproval("eligibility.result")).toBe(true);
  });

  it("uses the strict default policy to require approval for everything internal", () => {
    expect(requiresApproval("loa.draft", STRICT_APPROVAL_POLICY)).toBe(true);
  });

  it("auto-approves an internal action only when policy lists it", () => {
    const policy: ApprovalPolicy = { autoApproveKinds: ["eligibility.result"] };
    expect(requiresApproval("eligibility.result", policy)).toBe(false);
    expect(requiresApproval("loa.draft", policy)).toBe(true);
  });
});
