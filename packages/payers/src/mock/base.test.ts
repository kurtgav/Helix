import { describe, it, expect } from "vitest";
import type { Service } from "@helix/shared";
import type { EligibilityQuery, LOADraft } from "../adapter";
import { createMaxicareAdapter } from "./maxicare";
import { createPhilHealthAdapter } from "./philhealth";

const mri: Service = { code: "MRI-BRAIN", name: "MRI of the Brain", category: "imaging" };
const cbc: Service = { code: "CBC", name: "Complete Blood Count", category: "laboratory" };

function query(memberId: string, service: Service): EligibilityQuery {
  return { payerId: "maxicare", memberId, planName: "Maxicare Prima", service };
}

describe("MockPayerAdapter.checkEligibility", () => {
  it("returns eligible for an active member", async () => {
    const adapter = createMaxicareAdapter();

    const result = await adapter.checkEligibility(query("MX-0098-2231", mri));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("eligible");
    expect(result.data.benefit).toContain("imaging");
  });

  it("returns ineligible for an inactive member", async () => {
    const adapter = createMaxicareAdapter();

    const result = await adapter.checkEligibility(query("MX-0044-7781", mri));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("ineligible");
  });

  it("returns needs_review for an unknown member (data gap, not a decision)", async () => {
    const adapter = createMaxicareAdapter();

    const result = await adapter.checkEligibility(query("MX-DOES-NOT-EXIST", mri));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("needs_review");
    expect(result.data.benefit).toBeUndefined();
  });

  it("cites the payer rule set as evidence", async () => {
    const adapter = createMaxicareAdapter();

    const result = await adapter.checkEligibility(query("MX-0098-2231", mri));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sources = result.data.evidence.map((e) => e.source);
    expect(sources).toContain("payer:maxicare/members");
    expect(result.data.evidence.some((e) => e.ref === "#imaging")).toBe(true);
  });

  it("rejects malformed input with an error result", async () => {
    const adapter = createMaxicareAdapter();

    const result = await adapter.checkEligibility({
      payerId: "",
      memberId: "",
      planName: "",
      // @ts-expect-error deliberately invalid service category
      service: { code: "X", name: "X", category: "not-a-category" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_input");
  });
});

describe("MockPayerAdapter.getRequirements", () => {
  it("imaging requires an LOA and a referral (Maxicare HMO)", async () => {
    const adapter = createMaxicareAdapter();

    const result = await adapter.getRequirements(mri, "Maxicare Prima");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const types = result.data.map((r) => r.type);
    expect(types).toContain("loa");
    expect(types).toContain("referral");
    expect(result.data.every((r) => r.required)).toBe(true);
    expect(result.data.every((r) => r.present === false)).toBe(true);
  });

  it("laboratory does NOT require an LOA", async () => {
    const adapter = createMaxicareAdapter();

    const result = await adapter.getRequirements(cbc, "Maxicare Prima");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const types = result.data.map((r) => r.type);
    expect(types).not.toContain("loa");
    expect(types).toContain("member_id");
  });

  it("returns an empty list for a category the payer has no rule for", async () => {
    const adapter = createMaxicareAdapter();
    const dental: Service = { code: "TOOTH", name: "Extraction", category: "dental" };

    const result = await adapter.getRequirements(dental, "Maxicare Prima");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toEqual([]);
  });

  it("PhilHealth imaging is case-rate based and needs no LOA", async () => {
    const adapter = createPhilHealthAdapter();

    const result = await adapter.getRequirements(mri, "PhilHealth Konsulta");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.map((r) => r.type)).not.toContain("loa");
  });
});

describe("MockPayerAdapter.submitLOA / getStatus", () => {
  const draft: LOADraft = {
    payerId: "maxicare",
    memberId: "MX-0098-2231",
    planName: "Maxicare Prima",
    serviceCode: "MRI-BRAIN",
    serviceCategory: "imaging",
    body: "Requesting LOA for MRI of the Brain for member MX-0098-2231.",
    requiredDocs: ["loa", "referral"],
  };

  it("submits an LOA and returns a deterministic external reference", async () => {
    const adapter = createMaxicareAdapter();

    const a = await adapter.submitLOA(draft);
    const b = await adapter.submitLOA(draft);

    expect(a.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.data.status).toBe("submitted");
    // Base36 (alphanumeric): a reference must never read like a 9–10 digit
    // member/PhilHealth identifier (PHI-shaped digit runs are banned on the
    // console surface).
    expect(a.data.externalRef).toMatch(/^MAXICARE-LOA-[0-9A-Z]+$/);
    expect(a.data.externalRef).not.toMatch(/\d{9,}/);
    expect(a.data.externalRef).toBe(b.data.externalRef); // deterministic
    expect(a.data.evidence[0]?.ref).toBe("#imaging");
  });

  it("rejects a malformed draft", async () => {
    const adapter = createMaxicareAdapter();

    // @ts-expect-error missing required fields
    const result = await adapter.submitLOA({ payerId: "maxicare" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_input");
  });

  it("getStatus returns a deterministic, valid LOA status", async () => {
    const adapter = createMaxicareAdapter();
    const submitted = await adapter.submitLOA(draft);
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;

    const s1 = await adapter.getStatus(submitted.data.externalRef);
    const s2 = await adapter.getStatus(submitted.data.externalRef);

    expect(s1.ok).toBe(true);
    if (!s1.ok || !s2.ok) return;
    expect(["submitted", "approved"]).toContain(s1.data);
    expect(s1.data).toBe(s2.data);
  });

  it("getStatus rejects an empty reference", async () => {
    const adapter = createMaxicareAdapter();

    const result = await adapter.getStatus("   ");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("invalid_input");
  });
});
