// Demo seed entrypoint.
//
//   pnpm tsx scripts/seed.ts
//
// With DATABASE_URL set  -> inserts the deterministic dataset into @helix/db
//                           (idempotent: re-runs conflict-skip on primary keys).
// Without DATABASE_URL   -> writes scripts/seed-data.json for the web ROI panel
//                           running in mock mode.
//
// Deterministic: no Math.random / Date.now. Logs counts + ROI only — never PHI.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildDataset, type SeedDataset } from "./dataset";

const OUT_FILE = join(dirname(fileURLToPath(import.meta.url)), "seed-data.json");

async function main(): Promise<void> {
  const dataset = buildDataset();

  const hasDb = typeof process.env.DATABASE_URL === "string" && process.env.DATABASE_URL.trim() !== "";
  if (hasDb) {
    await seedDatabase(dataset);
  } else {
    emitJson(dataset);
  }

  logSummary(dataset, hasDb);
}

function emitJson(dataset: SeedDataset): void {
  writeFileSync(OUT_FILE, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
}

async function seedDatabase(dataset: SeedDataset): Promise<void> {
  // Imported lazily so the JSON path never pulls in the postgres driver.
  const db = await import("@helix/db");
  const client = db.getDb();

  await client.insert(db.orgs).values({
    id: dataset.org.id,
    name: dataset.org.name,
    createdAt: new Date(dataset.org.createdAt),
  }).onConflictDoNothing();

  await client.insert(db.users).values(
    dataset.users.map((u) => ({
      id: u.id,
      orgId: u.orgId,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      createdAt: new Date(u.createdAt),
    })),
  ).onConflictDoNothing();

  await client.insert(db.payers).values(
    dataset.payers.map((p) => ({ id: p.id, name: p.name, kind: p.kind, mode: p.mode })),
  ).onConflictDoNothing();

  await client.insert(db.services).values(
    dataset.services.map((s) => ({ code: s.code, name: s.name, category: s.category })),
  ).onConflictDoNothing();

  await client.insert(db.patients).values(
    dataset.patients.map((p) => ({
      id: p.id,
      orgId: p.orgId,
      fullName: p.fullName,
      birthDate: p.birthDate,
      sex: p.sex,
      createdAt: new Date(p.createdAt),
    })),
  ).onConflictDoNothing();

  await client.insert(db.coverage).values(
    dataset.coverages.map((c) => ({
      id: c.id,
      patientId: c.patientId,
      payerId: c.payerId,
      memberId: c.memberId,
      planName: c.planName,
      status: c.status,
    })),
  ).onConflictDoNothing();

  await client.insert(db.encounters).values(
    dataset.encounters.map((e) => ({
      id: e.encounter.id,
      orgId: e.encounter.orgId,
      patientId: e.encounter.patientId,
      coverageId: e.encounter.coverageId,
      serviceCode: e.encounter.service.code,
      status: e.encounter.status,
      createdAt: new Date(e.encounter.createdAt),
    })),
  ).onConflictDoNothing();

  await client.insert(db.eligibilityChecks).values(
    dataset.encounters.map((e) => ({
      id: uuidFor(e.encounter.id, "elig"),
      encounterId: e.encounter.id,
      status: e.eligibility.status,
      benefit: e.eligibility.benefit ?? null,
      requirements: e.eligibility.requirements,
      gaps: e.eligibility.gaps,
      evidence: e.eligibility.evidence,
      checkedAt: new Date(e.eligibility.checkedAt),
    })),
  ).onConflictDoNothing();

  const loas = dataset.encounters
    .filter((e) => e.loa !== undefined)
    .map((e) => {
      const loa = e.loa as NonNullable<typeof e.loa>;
      return {
        id: loa.id,
        encounterId: loa.encounterId,
        payerId: loa.payerId,
        serviceCode: loa.serviceCode,
        status: loa.status,
        body: loa.body,
        requiredDocs: loa.requiredDocs,
        missingDocs: loa.missingDocs,
        createdAt: new Date(loa.createdAt),
      };
    });
  if (loas.length > 0) {
    await client.insert(db.loaRequests).values(loas).onConflictDoNothing();
  }

  // ROI events land in the append-only audit log as agent actions.
  await client.insert(db.auditLog).values(
    dataset.events.map((ev, i) => ({
      id: uuidFor(`${ev.type}:${i}`, "audit"),
      orgId: ev.orgId,
      actorType: "agent" as const,
      actorId: "eligibility-agent",
      action: ev.type,
      metadata: { ...ev } as Record<string, unknown>,
      at: new Date(ev.at),
    })),
  ).onConflictDoNothing();
}

// Small deterministic uuid for DB-only side rows (checks/audit) not carried on
// the domain objects. Mirrors dataset.ts's derivation to stay stable per run.
function uuidFor(seed: string, kind: string): string {
  // Cheap deterministic hash → RFC-4122 shape. Local to the DB path.
  let h = 0x811c9dc5;
  const s = `${kind}:${seed}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const hex = (h.toString(16).padStart(8, "0") + s.length.toString(16).padStart(4, "0")).padEnd(32, "0").slice(0, 32);
  const c = hex.split("");
  c[12] = "5";
  c[16] = "8";
  const x = c.join("");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

function logSummary(dataset: SeedDataset, wroteDb: boolean): void {
  const { roi } = dataset;
  const lines = [
    `Helix demo seed — ${dataset.org.name}`,
    `  sink:              ${wroteDb ? "@helix/db (DATABASE_URL set)" : `JSON → ${OUT_FILE}`}`,
    `  users:             ${dataset.users.length}`,
    `  payers:            ${dataset.payers.length}`,
    `  encounters:        ${dataset.encounters.length}`,
    `  checks run:        ${roi.checksRun}`,
    `  denials prevented: ${roi.denialsPrevented}`,
    `  pesos recovered:   ₱${roi.pesosRecovered.toLocaleString("en-PH")}`,
    `  hours saved:       ${roi.hoursSaved}`,
  ];
  // eslint-disable-next-line no-console -- CLI script user feedback (no PHI).
  console.log(lines.join("\n"));
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`seed failed: ${message}`);
  process.exitCode = 1;
});
