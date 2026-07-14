import { describe, it, expect } from "vitest";
import type { Gap, OrgId } from "@helix/shared";
import type { RoiWindow } from "../metrics";
import {
  DEFAULT_VERIFY_MS,
  LOA_DRAFT_HOURS,
  MANUAL_BASELINE_HOURS,
} from "./estimate";
import { aggregateRoi, type RoiCheckRow } from "./aggregate";

const ORG = "org_roi" as OrgId;

const WINDOW: RoiWindow = {
  orgId: ORG,
  windowStart: "2026-07-01T00:00:00.000Z",
  windowEnd: "2026-07-31T23:59:59.999Z",
};

const BLOCKING_GAP: Gap = { kind: "loa", message: "LOA missing", blocking: true };
const SOFT_GAP: Gap = { kind: "data", message: "note", blocking: false };

/** Build an in-window check row with sensible defaults; override per test. */
function check(overrides: Partial<RoiCheckRow> = {}): RoiCheckRow {
  return {
    serviceCode: "CBC",
    gaps: [],
    checkedAt: "2026-07-10T09:00:00.000Z",
    ...overrides,
  };
}

describe("aggregate.aggregateRoi", () => {
  it("returns an all-zero snapshot (no NaN) for empty input", () => {
    // Arrange
    const input = { orgId: ORG, checks: [], loaDraftedCount: 0 };
    // Act
    const snap = aggregateRoi(input, WINDOW);
    // Assert — every metric zero, and avgTimeToVerifyMs is 0, not NaN.
    expect(snap.checksRun).toBe(0);
    expect(snap.denialsPrevented).toBe(0);
    expect(snap.pesosRecovered).toBe(0);
    expect(snap.hoursSaved).toBe(0);
    expect(snap.avgTimeToVerifyMs).toBe(0);
    expect(Number.isNaN(snap.avgTimeToVerifyMs)).toBe(false);
    // Snapshot carries org + window through unchanged.
    expect(snap.orgId).toBe(ORG);
    expect(snap.windowStart).toBe(WINDOW.windowStart);
    expect(snap.windowEnd).toBe(WINDOW.windowEnd);
  });

  it("ignores checks whose checkedAt falls outside the window", () => {
    // Arrange — one before, one after, one inside the July window.
    const input = {
      orgId: ORG,
      checks: [
        check({ checkedAt: "2026-06-30T23:59:59.000Z" }),
        check({ checkedAt: "2026-08-01T00:00:00.000Z" }),
        check({ checkedAt: "2026-07-15T12:00:00.000Z" }),
      ],
      loaDraftedCount: 0,
    };
    // Act
    const snap = aggregateRoi(input, WINDOW);
    // Assert — only the in-window row counts.
    expect(snap.checksRun).toBe(1);
  });

  it("counts denials prevented and sums pesos only for blocking-gap checks", () => {
    // Arrange — two blocking (prevented), two non-blocking (not prevented).
    const input = {
      orgId: ORG,
      checks: [
        check({ serviceCode: "MRI-BRAIN", gaps: [BLOCKING_GAP] }), // +12000
        check({ serviceCode: "HD-SESSION", gaps: [SOFT_GAP, BLOCKING_GAP] }), // +4200
        check({ serviceCode: "CBC", gaps: [SOFT_GAP] }), // soft only → skip
        check({ serviceCode: "CBC", gaps: [] }), // clean → skip
      ],
      loaDraftedCount: 0,
    };
    // Act
    const snap = aggregateRoi(input, WINDOW);
    // Assert
    expect(snap.checksRun).toBe(4);
    expect(snap.denialsPrevented).toBe(2);
    expect(snap.pesosRecovered).toBe(12000 + 4200);
  });

  it("computes hoursSaved from in-window checks plus drafted LOAs", () => {
    // Arrange — 3 checks + 2 drafted LOAs.
    const input = {
      orgId: ORG,
      checks: [check(), check(), check()],
      loaDraftedCount: 2,
    };
    // Act
    const snap = aggregateRoi(input, WINDOW);
    // Assert — checks·baseline + loa·draft, tolerant of float representation.
    expect(snap.hoursSaved).toBeCloseTo(3 * MANUAL_BASELINE_HOURS + 2 * LOA_DRAFT_HOURS);
  });

  it("averages verify time, substituting DEFAULT_VERIFY_MS for rows without durationMs", () => {
    // Arrange — two measured durations and one missing (→ default).
    const input = {
      orgId: ORG,
      checks: [
        check({ durationMs: 1000 }),
        check({ durationMs: 3000 }),
        check(), // no durationMs
      ],
      loaDraftedCount: 0,
    };
    // Act
    const snap = aggregateRoi(input, WINDOW);
    // Assert — mean of {1000, 3000, DEFAULT_VERIFY_MS}, rounded to a whole ms.
    const expected = Math.round((1000 + 3000 + DEFAULT_VERIFY_MS) / 3);
    expect(snap.avgTimeToVerifyMs).toBe(expected);
    expect(Number.isInteger(snap.avgTimeToVerifyMs)).toBe(true);
  });

  it("excludes out-of-window checks from the average as well as the counts", () => {
    // Arrange — a wildly large out-of-window duration must not skew the mean.
    const input = {
      orgId: ORG,
      checks: [
        check({ durationMs: 1000 }),
        check({ checkedAt: "2020-01-01T00:00:00.000Z", durationMs: 999999 }),
      ],
      loaDraftedCount: 0,
    };
    // Act
    const snap = aggregateRoi(input, WINDOW);
    // Assert — only the single in-window 1000ms row contributes.
    expect(snap.avgTimeToVerifyMs).toBe(1000);
    expect(snap.checksRun).toBe(1);
  });
});
