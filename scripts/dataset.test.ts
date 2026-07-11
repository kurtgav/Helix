import { describe, it, expect } from "vitest";
import { computeRoi } from "@helix/core";
import { buildDataset } from "./dataset";

describe("buildDataset", () => {
  it("is deterministic across runs", () => {
    expect(JSON.stringify(buildDataset())).toEqual(JSON.stringify(buildDataset()));
  });

  it("creates the demo org and the three RBAC users", () => {
    const { org, users } = buildDataset();
    expect(org.name).toBe("Helix Diagnostics, Makati");
    expect(users.map((u) => u.role).sort()).toEqual(["owner", "staff", "viewer"]);
  });

  it("creates ~30 encounters across the four PH payers", () => {
    const { encounters, payers } = buildDataset();
    expect(encounters).toHaveLength(30);
    expect(payers.map((p) => p.name).sort()).toEqual([
      "Intellicare",
      "Maxicare",
      "Medicard",
      "PhilHealth",
    ]);
    const usedPayers = new Set(encounters.map((e) => e.payerId));
    expect(usedPayers.size).toBe(4);
  });

  it("mixes eligible, ineligible, and LOA-needed vs no-LOA services", () => {
    const { encounters } = buildDataset();
    const statuses = new Set(encounters.map((e) => e.eligibility.status));
    expect(statuses.has("eligible")).toBe(true);
    expect(statuses.has("ineligible")).toBe(true);

    const loaNeeded = encounters.filter((e) => e.needsLoa);
    const noLoa = encounters.filter((e) => !e.needsLoa);
    expect(loaNeeded.length).toBeGreaterThan(0);
    expect(noLoa.length).toBeGreaterThan(0);
  });

  it("drafts LOA requests only for eligible LOA-needed encounters", () => {
    const { encounters } = buildDataset();
    for (const e of encounters) {
      const shouldHaveLoa = e.needsLoa && e.eligibility.status === "eligible";
      expect(e.loa !== undefined).toBe(shouldHaveLoa);
    }
  });

  it("produces a positive, internally consistent ROI snapshot", () => {
    const { roi, encounters, events, window } = buildDataset();

    // ROI must recompute identically from the emitted events.
    expect(computeRoi(events, window)).toEqual(roi);

    expect(roi.checksRun).toBe(encounters.length);
    expect(roi.denialsPrevented).toBeGreaterThan(0);
    expect(roi.pesosRecovered).toBeGreaterThan(0);
    expect(roi.hoursSaved).toBeGreaterThan(0);
  });

  it("ties denialsPrevented and pesosRecovered to flagged encounters", () => {
    const { roi, encounters } = buildDataset();
    const prevented = encounters.filter((e) => e.denialPrevented);
    const expectedPesos = prevented.reduce((sum, e) => sum + e.costPesos, 0);

    expect(roi.denialsPrevented).toBe(prevented.length);
    expect(roi.pesosRecovered).toBe(expectedPesos);
  });

  it("saves 15 min per check plus 30 min per auto-drafted LOA", () => {
    const { roi, encounters } = buildDataset();
    const loaDrafted = encounters.filter((e) => e.loa !== undefined).length;
    const expectedHours = encounters.length * 0.25 + loaDrafted * 0.5;
    expect(roi.hoursSaved).toBeCloseTo(expectedHours, 6);
  });

  it("keeps foreign keys internally resolvable", () => {
    const { encounters, patients, coverages, payers } = buildDataset();
    const patientIds = new Set(patients.map((p) => p.id));
    const coverageIds = new Set(coverages.map((c) => c.id));
    const payerIds = new Set(payers.map((p) => p.id));

    for (const e of encounters) {
      expect(patientIds.has(e.encounter.patientId)).toBe(true);
      expect(coverageIds.has(e.encounter.coverageId)).toBe(true);
      expect(payerIds.has(e.payerId)).toBe(true);
    }
  });
});
