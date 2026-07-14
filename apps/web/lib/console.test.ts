import { beforeAll, describe, expect, it } from "vitest";
import { DEMO_ENCOUNTERS } from "./demo";
import {
  formatRelativeTime,
  getConsoleData,
  mapDemoEncounters,
  summarizeDemo,
  synthesizeAuditTrail,
} from "./console";

// getConsoleData reads hasDatabase() at call time; keep the suite in mock mode so
// it exercises the synthetic projection without needing a live DATABASE_URL.
beforeAll(() => {
  delete process.env.DATABASE_URL;
});

// All synthetic patient initials that must NEVER appear in a PHI-free projection.
const ALL_INITIALS = DEMO_ENCOUNTERS.map((e) => e.patientInitials);

describe("mapDemoEncounters", () => {
  it("projects to the PHI-free card shape and drops patientInitials", () => {
    const rows = mapDemoEncounters(DEMO_ENCOUNTERS);
    expect(rows).toHaveLength(DEMO_ENCOUNTERS.length);
    const first = rows[0]!;
    expect(Object.keys(first).sort()).toEqual([
      "at",
      "category",
      "id",
      "payer",
      "service",
      "status",
    ]);
    expect("patientInitials" in first).toBe(false);
  });

  it("carries service, payer, status, and time through unchanged", () => {
    const source = DEMO_ENCOUNTERS[0]!;
    const row = mapDemoEncounters([source])[0]!;
    expect(row.id).toBe(source.id);
    expect(row.service).toBe(source.service);
    expect(row.payer).toBe(source.payer);
    expect(row.status).toBe(source.status);
    expect(row.at).toBe(source.at);
  });

  it("derives a service category (imaging for MRI)", () => {
    const mri = DEMO_ENCOUNTERS.find((e) => e.service.startsWith("MRI"))!;
    const row = mapDemoEncounters([mri])[0]!;
    expect(row.category).toBe("imaging");
  });
});

describe("summarizeDemo", () => {
  it("counts awaiting / approved and reports the true total", () => {
    const summary = summarizeDemo(DEMO_ENCOUNTERS);
    expect(summary.total).toBe(DEMO_ENCOUNTERS.length);
    expect(summary.awaitingApproval).toBe(
      DEMO_ENCOUNTERS.filter((e) => e.status === "awaiting_approval").length,
    );
    expect(summary.approved).toBe(
      DEMO_ENCOUNTERS.filter((e) => e.status === "approved").length,
    );
  });
});

describe("synthesizeAuditTrail", () => {
  const trail = synthesizeAuditTrail(DEMO_ENCOUNTERS);

  it("produces between 8 and 12 entries", () => {
    expect(trail.length).toBeGreaterThanOrEqual(8);
    expect(trail.length).toBeLessThanOrEqual(12);
  });

  it("is newest-first (descending by timestamp)", () => {
    for (let i = 1; i < trail.length; i++) {
      expect(trail[i - 1]!.at >= trail[i]!.at).toBe(true);
    }
  });

  it("has unique ids", () => {
    const ids = new Set(trail.map((e) => e.id));
    expect(ids.size).toBe(trail.length);
  });

  it("records eligibility.checked as an agent run with model + full metadata", () => {
    const elig = trail.find((e) => e.action === "eligibility.checked");
    expect(elig).toBeDefined();
    expect(elig!.actorType).toBe("agent");
    expect(elig!.model).toBe("mock-llm");
    expect(elig!.promptVersion).toBeTruthy();
    expect(Object.keys(elig!.metadata ?? {}).sort()).toEqual([
      "confidence",
      "gapCount",
      "serviceCode",
      "status",
    ]);
  });

  it("exercises all three actor types and both a decision approval and rejection", () => {
    const actors = new Set(trail.map((e) => e.actorType));
    expect(actors.has("agent")).toBe(true);
    expect(actors.has("user")).toBe(true);
    expect(actors.has("system")).toBe(true);
    expect(trail.some((e) => e.action === "loa.approved")).toBe(true);
    expect(trail.some((e) => e.action === "loa.rejected")).toBe(true);
  });

  it("is PHI-free — no patient initials anywhere in the ledger", () => {
    const serialized = JSON.stringify(trail);
    for (const initials of ALL_INITIALS) {
      expect(serialized).not.toContain(initials);
    }
  });
});

describe("formatRelativeTime", () => {
  const now = Date.UTC(2026, 6, 14, 12, 0, 0);

  it("renders recent times as 'just now'", () => {
    expect(formatRelativeTime(new Date(now - 10_000).toISOString(), now)).toBe(
      "just now",
    );
  });

  it("renders minutes, hours, and days", () => {
    expect(formatRelativeTime(new Date(now - 5 * 60_000).toISOString(), now)).toBe(
      "5m ago",
    );
    expect(
      formatRelativeTime(new Date(now - 3 * 3_600_000).toISOString(), now),
    ).toBe("3h ago");
    expect(
      formatRelativeTime(new Date(now - 2 * 86_400_000).toISOString(), now),
    ).toBe("2d ago");
  });

  it("returns a dash for unparseable input", () => {
    expect(formatRelativeTime("not-a-date", now)).toBe("—");
  });
});

describe("getConsoleData (mock mode)", () => {
  it("returns the synthetic projection with a well-formed shape", async () => {
    const view = await getConsoleData();
    expect(view.live).toBe(false);
    expect(view.encounters).toHaveLength(DEMO_ENCOUNTERS.length);
    expect(view.audit.length).toBeGreaterThanOrEqual(8);
    expect(view.audit.length).toBeLessThanOrEqual(12);
    expect(view.summary.total).toBe(DEMO_ENCOUNTERS.length);
  });

  it("never leaks patient initials through the encounter projection", async () => {
    const view = await getConsoleData();
    const serialized = JSON.stringify(view);
    for (const initials of ALL_INITIALS) {
      expect(serialized).not.toContain(initials);
    }
  });
});
