import { describe, it, expect } from "vitest";
import type { Requirement, Service } from "@helix/shared";
import { createMaxicareAdapter } from "@helix/payers";
import {
  mergeRequirements,
  reconcilePresence,
  detectMissingDocGaps,
  serviceRequiresLOA,
  resolveRequirements,
  LOCAL_BASELINE,
} from "./rules";

const req = (
  type: Requirement["type"],
  required = true,
  present = false,
): Requirement => ({ type, label: `${type} label`, required, present });

const MRI: Service = {
  code: "MRI-BRAIN",
  name: "MRI of the Brain",
  category: "imaging",
};

describe("rules.mergeRequirements", () => {
  it("dedupes by type and OR-s required so neither source can relax it", () => {
    const primary = [req("member_id", false)];
    const secondary = [req("member_id", true)];

    const merged = mergeRequirements(primary, secondary);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.required).toBe(true);
  });

  it("does not mutate its inputs", () => {
    const primary = [req("loa")];
    const secondary = [req("referral")];
    const snapshot = JSON.parse(JSON.stringify(primary));

    mergeRequirements(primary, secondary);

    expect(primary).toEqual(snapshot);
  });
});

describe("rules.reconcilePresence", () => {
  it("marks a requirement present only when its doc was collected", () => {
    const reconciled = reconcilePresence(
      [req("member_id"), req("referral")],
      ["member_id"],
    );

    expect(reconciled.find((r) => r.type === "member_id")?.present).toBe(true);
    expect(reconciled.find((r) => r.type === "referral")?.present).toBe(false);
  });
});

describe("rules.detectMissingDocGaps", () => {
  it("flags required, absent docs but never the LOA itself", () => {
    const gaps = detectMissingDocGaps([
      req("loa", true, false),
      req("referral", true, false),
      req("member_id", true, true),
    ]);

    expect(gaps).toHaveLength(1);
    expect(gaps[0]?.kind).toBe("referral");
    expect(gaps[0]?.blocking).toBe(true);
  });
});

describe("rules.serviceRequiresLOA", () => {
  it("is true only when a required LOA is present in the set", () => {
    expect(serviceRequiresLOA([req("loa")])).toBe(true);
    expect(serviceRequiresLOA([req("member_id")])).toBe(false);
  });
});

describe("rules.resolveRequirements", () => {
  it("combines Maxicare imaging rules with the local baseline and reconciles presence", async () => {
    const adapter = createMaxicareAdapter();

    const result = await resolveRequirements(adapter, MRI, "Maxicare Prima", [
      "member_id",
      "valid_id",
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const types = result.data.map((r) => r.type).sort();
    // imaging → loa, referral, member_id, valid_id (baseline dedupes cleanly)
    expect(types).toEqual(["loa", "member_id", "referral", "valid_id"]);
    expect(result.data.find((r) => r.type === "member_id")?.present).toBe(true);
    expect(result.data.find((r) => r.type === "referral")?.present).toBe(false);
  });

  it("always includes the identity baseline requirements", () => {
    const baselineTypes = LOCAL_BASELINE.map((r) => r.type);
    expect(baselineTypes).toContain("member_id");
    expect(baselineTypes).toContain("valid_id");
  });
});
