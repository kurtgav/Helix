import { describe, it, expect } from "vitest";
import type { OrgId } from "@helix/shared";
import { computeRoi, type RoiEvent } from "./metrics";

const ORG = "org_1" as OrgId;
const OTHER = "org_2" as OrgId;

const WINDOW = {
  orgId: ORG,
  windowStart: "2026-07-01T00:00:00.000Z",
  windowEnd: "2026-07-31T23:59:59.999Z",
};

describe("metrics.computeRoi", () => {
  it("aggregates checks, denials, pesos, hours, and avg verify time", () => {
    const events: RoiEvent[] = [
      {
        type: "eligibility.checked",
        orgId: ORG,
        at: "2026-07-05T09:00:00.000Z",
        durationMs: 1000,
        manualBaselineHours: 0.25,
      },
      {
        type: "eligibility.checked",
        orgId: ORG,
        at: "2026-07-06T09:00:00.000Z",
        durationMs: 3000,
        manualBaselineHours: 0.25,
      },
      {
        type: "denial.prevented",
        orgId: ORG,
        at: "2026-07-07T09:00:00.000Z",
        pesosRecovered: 12000,
      },
      {
        type: "time.saved",
        orgId: ORG,
        at: "2026-07-08T09:00:00.000Z",
        hoursSaved: 1.5,
      },
    ];

    const snap = computeRoi(events, WINDOW);
    expect(snap.checksRun).toBe(2);
    expect(snap.denialsPrevented).toBe(1);
    expect(snap.pesosRecovered).toBe(12000);
    expect(snap.hoursSaved).toBeCloseTo(0.25 + 0.25 + 1.5);
    expect(snap.avgTimeToVerifyMs).toBe(2000); // (1000 + 3000) / 2
    expect(snap.orgId).toBe(ORG);
  });

  it("ignores events from other orgs", () => {
    const events: RoiEvent[] = [
      {
        type: "denial.prevented",
        orgId: OTHER,
        at: "2026-07-07T09:00:00.000Z",
        pesosRecovered: 99999,
      },
    ];
    const snap = computeRoi(events, WINDOW);
    expect(snap.denialsPrevented).toBe(0);
    expect(snap.pesosRecovered).toBe(0);
  });

  it("ignores events outside the window", () => {
    const events: RoiEvent[] = [
      {
        type: "eligibility.checked",
        orgId: ORG,
        at: "2026-06-30T23:59:59.000Z",
        durationMs: 1000,
        manualBaselineHours: 0.25,
      },
    ];
    const snap = computeRoi(events, WINDOW);
    expect(snap.checksRun).toBe(0);
  });

  it("returns an all-zero snapshot with no NaN for empty input", () => {
    const snap = computeRoi([], WINDOW);
    expect(snap.checksRun).toBe(0);
    expect(snap.avgTimeToVerifyMs).toBe(0);
    expect(Number.isNaN(snap.avgTimeToVerifyMs)).toBe(false);
    expect(snap.pesosRecovered).toBe(0);
    expect(snap.hoursSaved).toBe(0);
  });

  it("rounds average verify time to a whole millisecond", () => {
    const events: RoiEvent[] = [
      { type: "eligibility.checked", orgId: ORG, at: "2026-07-05T09:00:00.000Z", durationMs: 1000, manualBaselineHours: 0 },
      { type: "eligibility.checked", orgId: ORG, at: "2026-07-05T09:00:00.000Z", durationMs: 1001, manualBaselineHours: 0 },
      { type: "eligibility.checked", orgId: ORG, at: "2026-07-05T09:00:00.000Z", durationMs: 1001, manualBaselineHours: 0 },
    ];
    const snap = computeRoi(events, WINDOW);
    expect(Number.isInteger(snap.avgTimeToVerifyMs)).toBe(true);
    expect(snap.avgTimeToVerifyMs).toBe(1001); // round(3002/3 = 1000.67)
  });
});
