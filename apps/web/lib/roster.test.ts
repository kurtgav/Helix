import { describe, it, expect } from "vitest";
import type { RoiSnapshot } from "@helix/shared";
import { buildExecutiveBrief, ROSTER } from "./roster";

// A believable full-activity snapshot; individual tests override single fields.
function makeRoi(over: Partial<RoiSnapshot> = {}): RoiSnapshot {
  return {
    orgId: "org_demo" as RoiSnapshot["orgId"],
    checksRun: 180,
    denialsPrevented: 37,
    pesosRecovered: 372_100,
    hoursSaved: 22.5,
    avgTimeToVerifyMs: 1800,
    windowStart: "2026-07-01T00:00:00.000Z",
    windowEnd: "2026-07-31T23:59:59.999Z",
    ...over,
  };
}

describe("buildExecutiveBrief", () => {
  it("returns between 2 and 4 sentences", () => {
    const lines = buildExecutiveBrief(makeRoi(), true);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.length).toBeLessThanOrEqual(4);
  });

  it("summarizes checks, denials, pesos, and hours from the snapshot", () => {
    const text = buildExecutiveBrief(makeRoi(), true).join(" ");
    expect(text).toContain("180 walk-ins");
    expect(text).toContain("37 likely denials");
    expect(text).toContain("₱372,100");
    expect(text).toContain("22.5 hrs");
  });

  it("includes the agent turnaround time when available", () => {
    const text = buildExecutiveBrief(makeRoi({ avgTimeToVerifyMs: 1800 }), true).join(" ");
    expect(text).toContain("1.8s");
  });

  it("omits the turnaround clause when avg time is zero", () => {
    const lead = buildExecutiveBrief(makeRoi({ avgTimeToVerifyMs: 0 }), true)[0];
    expect(lead).toBe("This month, Helix verified 180 walk-ins.");
  });

  it("uses singular nouns for a count of one", () => {
    const text = buildExecutiveBrief(
      makeRoi({ checksRun: 1, denialsPrevented: 1 }),
      true,
    ).join(" ");
    expect(text).toContain("1 walk-in");
    expect(text).not.toContain("1 walk-ins");
    expect(text).toContain("1 likely denial");
    expect(text).not.toContain("1 likely denials");
  });

  it("closes with a live-source sentence when live is true", () => {
    const lines = buildExecutiveBrief(makeRoi(), true);
    expect(lines[lines.length - 1]).toContain("approved, audited encounters");
  });

  it("closes with a demo-baseline sentence when live is false", () => {
    const lines = buildExecutiveBrief(makeRoi(), false);
    expect(lines[lines.length - 1]).toContain("demo baseline");
  });

  it("degrades gracefully to a quiet brief when no checks have run", () => {
    const lines = buildExecutiveBrief(makeRoi({ checksRun: 0 }), true);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.length).toBeLessThanOrEqual(4);
    expect(lines[0]).toContain("No verifications have run");
    expect(lines[lines.length - 1]).toContain("approved, audited encounters");
  });

  it("falls back to a pesos-only claim line when no denials are counted but money is at stake", () => {
    const text = buildExecutiveBrief(
      makeRoi({ denialsPrevented: 0, pesosRecovered: 5000 }),
      true,
    ).join(" ");
    expect(text).toContain("protected ₱5,000");
    expect(text).not.toContain("It caught");
  });

  it("clamps negative or fractional inputs instead of leaking them into copy", () => {
    const lines = buildExecutiveBrief(
      makeRoi({ checksRun: 12.9, denialsPrevented: -4, pesosRecovered: -100, hoursSaved: -1 }),
      false,
    );
    const text = lines.join(" ");
    expect(text).toContain("12 walk-ins"); // truncated, not 12.9
    expect(text).not.toContain("12.9");
    expect(text).not.toContain("-4");
    expect(text).not.toContain("-100");
    // negatives clamp to zero: no denial line and no hours line survive
    expect(text).not.toContain("likely denial");
    expect(text).not.toContain("hrs");
    expect(lines).toHaveLength(2);
  });
});

describe("ROSTER", () => {
  it("lists all nine catalog agents plus the Supervisor", () => {
    expect(ROSTER).toHaveLength(10);
    expect(ROSTER.filter((a) => a.n !== null)).toHaveLength(9);
    expect(ROSTER.filter((a) => a.n === null)).toHaveLength(1);
  });

  it("marks exactly the three live teammates and gives them working links", () => {
    const live = ROSTER.filter((a) => a.status === "live");
    expect(live.map((a) => a.name)).toEqual([
      "Eligibility & Pre-Auth",
      "Revenue Cycle",
      "Receivables",
    ]);
    expect(live.map((a) => a.href)).toEqual(["/verify", "/revenue", "/ledger"]);
  });

  it("leaves every planned teammate without a link", () => {
    for (const agent of ROSTER.filter((a) => a.status === "planned")) {
      expect(agent.href).toBeUndefined();
    }
  });
});
