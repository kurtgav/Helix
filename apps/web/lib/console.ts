import "server-only";

// Server-only data seam for the Operations Console. Projects two PHI-free views
// the console renders — recent encounters (service/payer/status/time, never a
// patient identifier) and the immutable audit trail (actor/action/model+prompt,
// PHI-free by contract) — plus the summary counts. Live from persisted rows when
// a database is configured, else a deterministic synthetic projection. Any DB
// read error falls back to the mock projection and logs a non-PHI message, so the
// page never hard-fails. Mirrors the live/mock seam in lib/agents.ts.

import {
  hasDatabase,
  recentEncounters,
  recentAuditEntries,
  countEncountersByStatus,
  DEMO_ORG_UUID,
  type AuditTrailRow,
  type EncounterSummaryRow,
} from "@helix/db";
import type { EncounterStatus, EligibilityStatus } from "@helix/shared";
import { DEMO_ENCOUNTERS, DEMO_SERVICES, type DemoEncounterRow } from "./demo";

// One row of the recent-activity table. Shared shape across DB + mock so the
// presentational table never sees a patient identifier — minimized by design.
export interface EncounterCardRow {
  id: string;
  service: string;
  payer: string;
  status: EncounterStatus;
  at: string; // ISO
  category: string;
}

export interface ConsoleView {
  live: boolean;
  encounters: EncounterCardRow[];
  audit: AuditTrailRow[];
  summary: { awaitingApproval: number; approved: number; total: number };
}

const ALL_STATUSES: readonly EncounterStatus[] = [
  "intake",
  "verifying",
  "awaiting_approval",
  "approved",
  "rejected",
  "closed",
];

const MOCK_MODEL = "mock-llm";
const ELIG_PROMPT = "eligibility@v4";
const LOA_PROMPT = "loa-draft@v2";
const LEDGER_BASE_SEQ = 1040;
const DRAFTED_STATES: readonly string[] = ["draft", "ready", "submitted"];

// --- pure projections (exported for unit tests) ----------------------------

function categoryForService(name: string): string {
  return DEMO_SERVICES.find((s) => s.name === name)?.category ?? "other";
}
function codeForService(name: string): string {
  return DEMO_SERVICES.find((s) => s.name === name)?.code ?? "OTHER";
}
function confidenceFor(status: EligibilityStatus): number {
  if (status === "eligible") return 0.97;
  if (status === "ineligible") return 0.9;
  return 0.78;
}

/** DemoEncounterRow -> PHI-free card row (drops patientInitials). */
export function mapDemoEncounters(
  rows: readonly DemoEncounterRow[],
): EncounterCardRow[] {
  return rows.map((r) => ({
    id: r.id,
    service: r.service,
    payer: r.payer,
    status: r.status,
    at: r.at,
    category: categoryForService(r.service),
  }));
}

/** Persisted EncounterSummaryRow (already PHI-free) -> shared card row. */
function mapSummaryRows(
  rows: readonly EncounterSummaryRow[],
): EncounterCardRow[] {
  return rows.map((r) => ({
    id: r.id,
    service: r.serviceName,
    payer: r.payerName,
    status: r.status,
    at: r.createdAt,
    category: r.serviceCategory,
  }));
}

interface SeedEvent {
  actorType: AuditTrailRow["actorType"];
  actorId: string;
  action: string;
  encounterId: string | null;
  model: string | null;
  promptVersion: string | null;
  metadata: Record<string, unknown> | null;
  at: string;
}

function plus(iso: string, seconds: number): string {
  return new Date(new Date(iso).getTime() + seconds * 1000).toISOString();
}

/**
 * Synthesize a realistic, PHI-free audit ledger for mock mode. Entries are keyed
 * to a curated subset of the demo encounters so ids cross-reference the activity
 * table, and so the ledger exercises all three actor glyphs plus an approval
 * (green) and a rejection (red). Sequence ids ascend in append order (oldest
 * smallest); the returned array is newest-first, matching recentAuditEntries().
 */
export function synthesizeAuditTrail(
  rows: readonly DemoEncounterRow[],
): AuditTrailRow[] {
  const seeds: SeedEvent[] = [];
  const picks = [rows[0], rows[2], rows[3], rows[5]].filter(
    (r): r is DemoEncounterRow => Boolean(r),
  );

  picks.forEach((enc, i) => {
    const serviceCode = codeForService(enc.service);

    if (i === 0) {
      seeds.push({
        actorType: "system",
        actorId: "system:intake",
        action: "encounter.created",
        encounterId: enc.id,
        model: null,
        promptVersion: null,
        metadata: { serviceCode, payer: enc.payer },
        at: enc.at,
      });
    }

    seeds.push({
      actorType: "agent",
      actorId: "agent:eligibility",
      action: "eligibility.checked",
      encounterId: enc.id,
      model: MOCK_MODEL,
      promptVersion: ELIG_PROMPT,
      metadata: {
        status: enc.eligibility,
        confidence: confidenceFor(enc.eligibility),
        serviceCode,
        gapCount: enc.blockingGaps,
      },
      at: plus(enc.at, 30),
    });

    if (DRAFTED_STATES.includes(enc.loaStatus)) {
      seeds.push({
        actorType: "agent",
        actorId: "agent:preauth",
        action: "loa.drafted",
        encounterId: enc.id,
        model: MOCK_MODEL,
        promptVersion: LOA_PROMPT,
        metadata: { serviceCode, docsMissing: enc.blockingGaps },
        at: plus(enc.at, 75),
      });
    }

    if (enc.status === "approved") {
      seeds.push({
        actorType: "user",
        actorId: "user:front-desk",
        action: "loa.approved",
        encounterId: enc.id,
        model: null,
        promptVersion: null,
        metadata: { decision: "approved" },
        at: plus(enc.at, 300),
      });
    } else if (enc.status === "rejected") {
      seeds.push({
        actorType: "user",
        actorId: "user:front-desk",
        action: "loa.rejected",
        encounterId: enc.id,
        model: null,
        promptVersion: null,
        metadata: { decision: "rejected", reason: "coverage_ineligible" },
        at: plus(enc.at, 300),
      });
    } else if (enc.status === "awaiting_approval" && enc.blockingGaps > 0) {
      seeds.push({
        actorType: "agent",
        actorId: "agent:preauth",
        action: "document.requested",
        encounterId: enc.id,
        model: MOCK_MODEL,
        promptVersion: LOA_PROMPT,
        metadata: { serviceCode, missingCount: enc.blockingGaps },
        at: plus(enc.at, 90),
      });
    }
  });

  const ascending = [...seeds].sort((a, b) =>
    a.at < b.at ? -1 : a.at > b.at ? 1 : 0,
  );
  const withIds: AuditTrailRow[] = ascending.map((seed, i) => ({
    id: `aud_${LEDGER_BASE_SEQ + i}`,
    ...seed,
  }));
  return withIds.reverse();
}

/** Summary counts from the demo dataset (pure). */
export function summarizeDemo(rows: readonly DemoEncounterRow[]): {
  awaitingApproval: number;
  approved: number;
  total: number;
} {
  return {
    awaitingApproval: rows.filter((r) => r.status === "awaiting_approval").length,
    approved: rows.filter((r) => r.status === "approved").length,
    total: rows.length,
  };
}

/** "3m ago" / "5h ago" / "2d ago" — short, mono-friendly. `nowMs` for determinism. */
export function formatRelativeTime(iso: string, nowMs: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const seconds = Math.round(Math.max(0, nowMs - then) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

// --- assembly --------------------------------------------------------------

function buildMockView(): ConsoleView {
  return {
    live: false,
    encounters: mapDemoEncounters(DEMO_ENCOUNTERS),
    audit: synthesizeAuditTrail(DEMO_ENCOUNTERS),
    summary: summarizeDemo(DEMO_ENCOUNTERS),
  };
}

async function summarizeDb(orgId: string): Promise<ConsoleView["summary"]> {
  const counts = await Promise.all(
    ALL_STATUSES.map((status) => countEncountersByStatus(orgId, status)),
  );
  const total = counts.reduce((sum, n) => sum + n, 0);
  const at = (status: EncounterStatus): number =>
    counts[ALL_STATUSES.indexOf(status)] ?? 0;
  return {
    awaitingApproval: at("awaiting_approval"),
    approved: at("approved"),
    total,
  };
}

/**
 * The console's data. Live from persisted rows when configured; deterministic
 * synthetic projection otherwise. DB errors degrade to the mock projection with
 * a PHI-free log — the page always renders.
 */
export async function getConsoleData(): Promise<ConsoleView> {
  if (!hasDatabase()) return buildMockView();
  try {
    const [encounterRows, audit, summary] = await Promise.all([
      recentEncounters(DEMO_ORG_UUID, 20),
      recentAuditEntries(DEMO_ORG_UUID, 30),
      summarizeDb(DEMO_ORG_UUID),
    ]);
    return {
      live: true,
      encounters: mapSummaryRows(encounterRows),
      audit,
      summary,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Guarded fallback — never PHI (read-only org-scoped query metadata only).
    console.error("[console] live read failed, using demo projection:", message);
    return buildMockView();
  }
}
