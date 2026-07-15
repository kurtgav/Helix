import { describe, it, expect } from "vitest";
import type { PolicyCheck, PolicyProfile } from "@helix/shared";
import { evaluatePolicyChecks, policyGaps, escalateStatus } from "./engine";

// A clean corporate-group profile: active, inside its term, PEC waived,
// benefit barely used. Overrides shape each scenario.
function profile(overrides: Partial<PolicyProfile> = {}): PolicyProfile {
  return {
    policyType: "corporate_group",
    planName: "Maxicare Prima",
    status: "active",
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    effectiveDate: "2026-01-01",
    pecCovered: true,
    mblPhp: 150_000,
    usedBenefitPhp: 24_000,
    loaValidityDays: 30,
    evidence: [
      { source: "payer:maxicare/members", ref: "#MX-1", snippet: "member row" },
      { source: "payer:maxicare/policy", ref: "#corporate-terms" },
    ],
    ...overrides,
  };
}

function run(p: PolicyProfile | null, serviceDate = "2026-07-15") {
  return evaluatePolicyChecks({ profile: p, payerKind: "hmo", serviceDate });
}

function byKind(checks: ReturnType<typeof run>, kind: string) {
  return checks.find((c) => c.kind === kind);
}

describe("evaluatePolicyChecks — unknown member", () => {
  it("emits a single unknown check when the profile is null", () => {
    const checks = run(null);
    expect(checks).toHaveLength(1);
    expect(checks[0]!.status).toBe("unknown");
    expect(checks[0]!.detail).toMatch(/not found/i);
  });
});

describe("evaluatePolicyChecks — coverage window", () => {
  it("passes inside the policy term", () => {
    const check = byKind(run(profile()), "coverage_window");
    expect(check?.status).toBe("pass");
    expect(check?.detail).toContain("2026-07-15");
  });

  it("fails after the term ends", () => {
    const lapsed = profile({ validFrom: "2025-01-01", validTo: "2025-12-31" });
    const check = byKind(run(lapsed), "coverage_window");
    expect(check?.status).toBe("fail");
    expect(check?.detail).toMatch(/outside the policy term/);
  });

  it("fails before the term starts", () => {
    const future = profile({ validFrom: "2026-09-01", validTo: "2027-08-31" });
    expect(byKind(run(future), "coverage_window")?.status).toBe("fail");
  });

  it("cites the retrieved profile evidence", () => {
    const check = byKind(run(profile()), "coverage_window");
    expect(check?.evidence.some((e) => e.source === "payer:maxicare/policy")).toBe(
      true,
    );
  });
});

describe("evaluatePolicyChecks — waiting period (individual plans)", () => {
  const individual = profile({
    policyType: "individual_family",
    planName: "Maxicare Prima Individual",
    validFrom: "2026-07-01",
    validTo: "2027-06-30",
    effectiveDate: "2026-07-01",
    waitingPeriodDays: 30,
    pecCovered: false,
    pecExclusionMonths: 12,
  });

  it("fails while the waiting period is active, with the lift date", () => {
    const check = byKind(run(individual, "2026-07-15"), "waiting_period");
    expect(check?.status).toBe("fail");
    expect(check?.detail).toContain("2026-07-31"); // 2026-07-01 + 30d
    expect(check?.detail).toContain("day 14 of 30");
  });

  it("passes once the waiting period was served", () => {
    const check = byKind(run(individual, "2026-08-15"), "waiting_period");
    expect(check?.status).toBe("pass");
  });

  it("is skipped when the plan declares no waiting period", () => {
    expect(byKind(run(profile()), "waiting_period")).toBeUndefined();
  });
});

describe("evaluatePolicyChecks — pre-existing conditions", () => {
  it("passes when the plan covers PEC (group waiver)", () => {
    const check = byKind(run(profile()), "pre_existing");
    expect(check?.status).toBe("pass");
    expect(check?.detail).toMatch(/group policy/);
  });

  it("flags attention (never fail) inside an individual exclusion window", () => {
    const individual = profile({
      policyType: "individual_family",
      effectiveDate: "2026-06-01",
      pecCovered: false,
      pecExclusionMonths: 12,
    });
    const check = byKind(run(individual, "2026-07-15"), "pre_existing");
    expect(check?.status).toBe("attention");
    expect(check?.detail).toContain("2027-06-01");
    expect(check?.detail).toMatch(/human must confirm/i);
  });

  it("passes after the exclusion lapses", () => {
    const individual = profile({
      policyType: "individual_family",
      effectiveDate: "2025-06-01",
      pecCovered: false,
      pecExclusionMonths: 12,
    });
    expect(byKind(run(individual, "2026-07-15"), "pre_existing")?.status).toBe(
      "pass",
    );
  });
});

describe("evaluatePolicyChecks — benefit limit", () => {
  it("passes with plenty of benefit remaining", () => {
    const check = byKind(run(profile()), "benefit_limit");
    expect(check?.status).toBe("pass");
    expect(check?.detail).toContain("₱126,000.00");
  });

  it("flags attention at ≥80% consumed", () => {
    const heavy = profile({ usedBenefitPhp: 130_000 });
    const check = byKind(run(heavy), "benefit_limit");
    expect(check?.status).toBe("attention");
    expect(check?.detail).toContain("87%");
  });

  it("fails when the MBL is exhausted", () => {
    const exhausted = profile({ usedBenefitPhp: 150_000 });
    const check = byKind(run(exhausted), "benefit_limit");
    expect(check?.status).toBe("fail");
    expect(check?.detail).toMatch(/exhausted/);
  });

  it("is skipped when usage is not reported", () => {
    const silent = profile();
    delete (silent as { usedBenefitPhp?: number }).usedBenefitPhp;
    expect(byKind(run(silent), "benefit_limit")).toBeUndefined();
  });
});

describe("evaluatePolicyChecks — claim filing window", () => {
  it("always tells staff when the claim must be filed, citing the rulebook", () => {
    const check = byKind(run(profile(), "2026-07-15"), "filing_window");
    expect(check?.status).toBe("pass");
    expect(check?.detail).toContain("2026-08-14"); // +30d HMO default
    expect(check?.evidence[0]!.source).toBe("reg:helix/hmo-claim-filing");
  });

  it("cites the PhilHealth circular for philhealth", () => {
    const checks = evaluatePolicyChecks({
      profile: profile({ policyType: "government" }),
      payerKind: "philhealth",
      serviceDate: "2026-07-15",
    });
    const check = checks.find((c) => c.kind === "filing_window");
    expect(check?.evidence[0]!.source).toBe(
      "reg:philhealth/philhealth-claim-filing",
    );
  });
});

describe("policyGaps", () => {
  it("maps fail → blocking gap, attention/unknown → note, pass → nothing", () => {
    const gaps = policyGaps([
      { kind: "coverage_window", status: "fail", label: "w", detail: "lapsed", evidence: [] },
      { kind: "pre_existing", status: "attention", label: "p", detail: "pec", evidence: [] },
      { kind: "benefit_limit", status: "pass", label: "b", detail: "ok", evidence: [] },
      { kind: "coverage_window", status: "unknown", label: "u", detail: "??", evidence: [] },
    ]);

    expect(gaps).toHaveLength(3);
    expect(gaps[0]).toMatchObject({ blocking: true, message: "lapsed" });
    expect(gaps[1]).toMatchObject({ blocking: false, message: "pec" });
    expect(gaps[2]).toMatchObject({ blocking: false, message: "??" });
  });
});

describe("escalateStatus — one-way severity", () => {
  const fail: PolicyCheck[] = [
    { kind: "coverage_window", status: "fail", label: "", detail: "", evidence: [] },
  ];
  const attention: PolicyCheck[] = [
    { kind: "pre_existing", status: "attention", label: "", detail: "", evidence: [] },
  ];
  const pass: PolicyCheck[] = [
    { kind: "benefit_limit", status: "pass", label: "", detail: "", evidence: [] },
  ];

  it("escalates eligible → ineligible on a hard fail", () => {
    expect(escalateStatus("eligible", fail)).toBe("ineligible");
  });

  it("escalates eligible → needs_review on attention", () => {
    expect(escalateStatus("eligible", attention)).toBe("needs_review");
  });

  it("never downgrades an adapter ineligible", () => {
    expect(escalateStatus("ineligible", pass)).toBe("ineligible");
    expect(escalateStatus("ineligible", attention)).toBe("ineligible");
  });

  it("keeps needs_review at least needs_review when checks pass", () => {
    expect(escalateStatus("needs_review", pass)).toBe("needs_review");
  });

  it("leaves eligible untouched when everything passes", () => {
    expect(escalateStatus("eligible", pass)).toBe("eligible");
  });
});
