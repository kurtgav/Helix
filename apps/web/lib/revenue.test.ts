import { describe, it, expect } from "vitest";
import {
  toDenialCase,
  toDenialCases,
  buildTriageRows,
  resolveMessage,
} from "./revenue";
import { DEMO_DENIAL_CASES } from "./demo";
import type { DenialCase, RevenueCycleFinding } from "@helix/shared";

// Pure-helper coverage for the Revenue Cycle seam. The agent run + resolve gate
// need a request scope (cookies) and RBAC and are exercised by e2e; here we test
// the deterministic mappers and the resolve message the UI renders.

describe("toDenialCase", () => {
  it("lowercases the payer name into the adapter registry key", () => {
    // Arrange — PhilHealth carries an internal capital, so a naive title-case
    // would break; the mapper must simply lowercase.
    const row = DEMO_DENIAL_CASES.find((c) => c.payer === "PhilHealth")!;

    // Act
    const mapped = toDenialCase(row);

    // Assert
    expect(mapped.payerId).toBe("philhealth");
  });

  it("carries the claim facts through and omits encounterId", () => {
    // Arrange
    const row = DEMO_DENIAL_CASES[1]!; // Intellicare MRI, missing_loa

    // Act
    const mapped = toDenialCase(row);

    // Assert
    expect(mapped).toMatchObject({
      id: row.id,
      payerId: "intellicare",
      serviceCode: row.serviceCode,
      serviceName: row.serviceName,
      amount: row.amount,
      reason: row.reason,
      deniedAt: row.deniedAt,
      ageDays: row.ageDays,
    });
    expect("encounterId" in mapped).toBe(false);
  });
});

describe("toDenialCases", () => {
  it("maps every row and lowercases every payer key", () => {
    // Act
    const mapped = toDenialCases(DEMO_DENIAL_CASES);

    // Assert
    expect(mapped).toHaveLength(DEMO_DENIAL_CASES.length);
    for (const denialCase of mapped) {
      expect(denialCase.payerId).toBe(denialCase.payerId.toLowerCase());
    }
  });
});

describe("buildTriageRows", () => {
  const cases: DenialCase[] = toDenialCases(DEMO_DENIAL_CASES);
  const first = cases[0]!;
  const finding: RevenueCycleFinding = {
    caseId: first.id,
    reason: first.reason,
    recommendedAction: "contact_payer",
    recoverable: true,
    amountAtRisk: first.amount,
    requiredFixes: ["confirm active coverage window"],
    risk: "low",
    rationale: "x",
  };

  it("joins a finding to its case for display, in finding order", () => {
    // Act
    const rows = buildTriageRows([finding], cases);

    // Assert
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      caseId: first.id,
      serviceName: first.serviceName,
      serviceCode: first.serviceCode,
      payerId: first.payerId,
      amount: first.amount,
      ageDays: first.ageDays,
      recoverable: true,
      risk: "low",
    });
  });

  it("is total — an orphan finding falls back to the case id, never drops", () => {
    // Arrange
    const orphan: RevenueCycleFinding = { ...finding, caseId: "no_such_case" };

    // Act
    const rows = buildTriageRows([orphan], cases);

    // Assert
    expect(rows).toHaveLength(1);
    expect(rows[0]!.serviceName).toBe("no_such_case");
    expect(rows[0]!.payerId).toBe("");
  });
});

describe("resolveMessage", () => {
  it("formats the recovered pesos on approval", () => {
    expect(resolveMessage("approved", 29050)).toBe(
      "₱29,050 marked for recovery — logged.",
    );
  });

  it("uses the not-pursued copy on rejection", () => {
    expect(resolveMessage("rejected", 0)).toBe("Marked as not pursued — logged.");
  });
});
