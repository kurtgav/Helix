import { describe, it, expect } from "vitest";
import {
  PHILHEALTH_CLAIM_FILING,
  PHILHEALTH_APPEAL,
  PHILHEALTH_RTH_REFILE,
  HMO_CLAIM_FILING,
  HMO_APPEAL,
  HMO_LOA_VALIDITY,
  listRules,
  claimFilingRule,
  appealRule,
  refileRule,
  ruleEvidence,
  assessDeadline,
  daysBetween,
} from "./phRules";

describe("PH rulebook — rule table", () => {
  it("selects the statutory PhilHealth 60-day filing rule for philhealth", () => {
    const rule = claimFilingRule("philhealth");
    expect(rule.days).toBe(60);
    expect(rule.authority).toBe("PhilHealth");
    expect(rule.ref).toContain("RA 7875");
    expect(rule.confidence).toBe("verified");
  });

  it("selects the contractual HMO defaults for hmo", () => {
    expect(claimFilingRule("hmo")).toBe(HMO_CLAIM_FILING);
    expect(appealRule("hmo")).toBe(HMO_APPEAL);
    expect(HMO_APPEAL.days).toBe(30);
  });

  it("selects the verified 15-day PhilHealth MR window for philhealth appeals", () => {
    expect(appealRule("philhealth")).toBe(PHILHEALTH_APPEAL);
    expect(PHILHEALTH_APPEAL.days).toBe(15);
    expect(PHILHEALTH_APPEAL.ref).toContain("03, s. 2008");
    expect(PHILHEALTH_APPEAL.confidence).toBe("verified");
  });

  it("exposes the verified 60-day PhilHealth RTH refile window, none for HMOs", () => {
    expect(refileRule("philhealth")).toBe(PHILHEALTH_RTH_REFILE);
    expect(PHILHEALTH_RTH_REFILE.days).toBe(60);
    expect(PHILHEALTH_RTH_REFILE.kind).toBe("refile");
    expect(refileRule("hmo")).toBeUndefined();
  });

  it("flags every contractual/assumed rule as verify-before-live", () => {
    for (const rule of listRules()) {
      if (rule.confidence !== "verified") {
        expect(rule.verifyBeforeLive).toBe(true);
      }
    }
  });

  it("keeps the LOA validity default conservative (3 days; payer value overrides)", () => {
    expect(HMO_LOA_VALIDITY.days).toBe(3);
    expect(HMO_LOA_VALIDITY.kind).toBe("loa_validity");
    expect(HMO_LOA_VALIDITY.verifyBeforeLive).toBe(true);
  });

  it("keeps the HMO filing default conservative (30 days, contractual)", () => {
    expect(HMO_CLAIM_FILING.days).toBe(30);
    expect(HMO_CLAIM_FILING.verifyBeforeLive).toBe(true);
  });
});

describe("ruleEvidence", () => {
  it("cites the authority, document ref, and verify-before-live caveat", () => {
    const verified = ruleEvidence(PHILHEALTH_CLAIM_FILING);
    expect(verified.source).toBe("reg:philhealth/philhealth-claim-filing");
    expect(verified.ref).toContain("RA 7875");
    expect(verified.snippet).not.toContain("[confirm before live use]");

    const assumed = ruleEvidence(HMO_APPEAL);
    expect(assumed.source).toBe("reg:helix/hmo-appeal");
    expect(assumed.snippet).toContain("[confirm before live use]");
  });
});

describe("assessDeadline — pure date math", () => {
  it("computes deadline, days remaining, and urgency from the basis date", () => {
    const assessed = assessDeadline(
      PHILHEALTH_CLAIM_FILING,
      "2026-07-01",
      "2026-07-15",
    );
    expect(assessed.basis).toBe("2026-07-01");
    expect(assessed.deadline).toBe("2026-08-30"); // +60 calendar days
    expect(assessed.daysRemaining).toBe(46);
    expect(assessed.urgency).toBe("open");
    expect(assessed.kind).toBe("claim_filing");
    expect(assessed.ruleRef).toBe("reg:philhealth/philhealth-claim-filing");
  });

  it("tiers urgency: critical ≤7d, soon ≤14d, expired <0d", () => {
    const critical = assessDeadline(HMO_APPEAL, "2026-07-01", "2026-07-25");
    expect(critical.daysRemaining).toBe(6);
    expect(critical.urgency).toBe("critical");

    const soon = assessDeadline(HMO_APPEAL, "2026-07-01", "2026-07-20");
    expect(soon.daysRemaining).toBe(11);
    expect(soon.urgency).toBe("soon");

    const expired = assessDeadline(HMO_APPEAL, "2026-05-01", "2026-07-15");
    expect(expired.daysRemaining).toBeLessThan(0);
    expect(expired.urgency).toBe("expired");
  });

  it("accepts full ISO timestamps and normalizes to calendar days", () => {
    const assessed = assessDeadline(
      HMO_APPEAL,
      "2026-07-01T23:59:59.000Z",
      "2026-07-02T00:00:01.000Z",
    );
    expect(assessed.basis).toBe("2026-07-01");
    expect(assessed.daysRemaining).toBe(29);
  });

  it("throws loudly on malformed dates", () => {
    expect(() => assessDeadline(HMO_APPEAL, "not-a-date", "2026-07-15")).toThrow(
      /Invalid ISO date/,
    );
  });
});

describe("daysBetween", () => {
  it("counts whole calendar days, negative when past", () => {
    expect(daysBetween("2026-07-01", "2026-07-15")).toBe(14);
    expect(daysBetween("2026-07-15", "2026-07-01")).toBe(-14);
    expect(daysBetween("2026-07-15", "2026-07-15")).toBe(0);
  });
});
