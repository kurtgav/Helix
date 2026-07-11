import { describe, it, expect } from "vitest";
import {
  InMemoryAuditLog,
  redact,
  redactMetadata,
  REDACTED,
  type AuditInput,
} from "./audit";

function baseInput(overrides: Partial<AuditInput> = {}): AuditInput {
  return {
    orgId: "org_1",
    actorType: "agent",
    actorId: "agent:eligibility",
    action: "eligibility.checked",
    ...overrides,
  };
}

describe("audit.redact — PHI redaction", () => {
  it("masks human-readable PHI in metadata while keeping references", () => {
    const entry = redact(
      baseInput({
        encounterId: "enc_1",
        metadata: {
          fullName: "Juan Dela Cruz",
          birthDate: "1985-03-01",
          sex: "M",
          payerId: "maxicare",
          memberId: "MX-00042",
          serviceCode: "MRI-BRAIN",
        },
      }),
    );
    const meta = entry.metadata!;
    expect(meta.fullName).toBe(REDACTED);
    expect(meta.birthDate).toBe(REDACTED);
    expect(meta.sex).toBe(REDACTED);
    // References / non-PHI kept for auditability.
    expect(meta.payerId).toBe("maxicare");
    expect(meta.memberId).toBe("MX-00042");
    expect(meta.serviceCode).toBe("MRI-BRAIN");
    expect(entry.encounterId).toBe("enc_1");
  });

  it("redacts nested and arrayed PHI without mutating the input", () => {
    const metadata = {
      patient: { fullName: "Maria Santos", notes: "chest pain" },
      contacts: [{ phone: "0917-000-0000" }],
    };
    const cleaned = redactMetadata(metadata);
    expect((cleaned.patient as Record<string, unknown>).fullName).toBe(REDACTED);
    expect((cleaned.patient as Record<string, unknown>).notes).toBe(REDACTED);
    expect(
      (cleaned.contacts as Array<Record<string, unknown>>)[0]!.phone,
    ).toBe(REDACTED);
    // Original object untouched (immutability).
    expect(metadata.patient.fullName).toBe("Maria Santos");
  });

  it("generates an id and timestamp and validates input at the boundary", () => {
    const entry = redact(baseInput());
    expect(entry.id).toBeTruthy();
    expect(() => new Date(entry.at).toISOString()).not.toThrow();
    // Boundary validation rejects malformed input.
    expect(() => redact(baseInput({ orgId: "" }))).toThrow();
  });

  it("returns a frozen (immutable) entry", () => {
    const entry = redact(baseInput());
    expect(Object.isFrozen(entry)).toBe(true);
  });
});

describe("audit.InMemoryAuditLog — append-only + immutable", () => {
  it("appends and lists entries in order", () => {
    const log = new InMemoryAuditLog();
    log.record(baseInput({ action: "eligibility.checked" }));
    log.record(baseInput({ action: "loa.drafted" }));
    const entries = log.list();
    expect(entries).toHaveLength(2);
    expect(entries[0]!.action).toBe("eligibility.checked");
    expect(entries[1]!.action).toBe("loa.drafted");
  });

  it("exposes no mutation API — only append/record/list/size", () => {
    const log = new InMemoryAuditLog();
    const asRecord = log as unknown as Record<string, unknown>;
    expect(asRecord.update).toBeUndefined();
    expect(asRecord.delete).toBeUndefined();
    expect(asRecord.remove).toBeUndefined();
    expect(asRecord.clear).toBeUndefined();
  });

  it("prevents callers from mutating stored entries", () => {
    const log = new InMemoryAuditLog();
    log.record(baseInput());
    const snapshot = log.list();
    // Returned array is frozen; mutating it must not change the log.
    expect(() => {
      (snapshot as unknown as unknown[]).push({} as never);
    }).toThrow();
    expect(log.size()).toBe(1);

    // Stored entry itself is frozen.
    const entry = snapshot[0]!;
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it("returns a fresh array each time so external mutation cannot corrupt state", () => {
    const log = new InMemoryAuditLog();
    log.record(baseInput());
    const first = log.list();
    const second = log.list();
    expect(first).not.toBe(second);
    expect(log.size()).toBe(1);
  });

  it("filters by org, encounter, action, and actor", () => {
    const log = new InMemoryAuditLog();
    log.record(baseInput({ orgId: "org_1", encounterId: "enc_1", action: "a" }));
    log.record(baseInput({ orgId: "org_1", encounterId: "enc_2", action: "b" }));
    log.record(baseInput({ orgId: "org_2", action: "a" }));

    expect(log.list({ orgId: "org_1" as never })).toHaveLength(2);
    expect(log.list({ encounterId: "enc_1" as never })).toHaveLength(1);
    expect(log.list({ action: "a" })).toHaveLength(2);
    expect(log.list({ actorId: "agent:eligibility" })).toHaveLength(3);
  });
});
