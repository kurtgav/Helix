// Audit — append-only, immutable audit log + PHI redaction.
// Every agent run and human approval records: actor, action, references
// (NOT raw PHI), model + prompt version, retrieved sources, timestamp.
// See brain/security-and-compliance: "Immutable audit log" + "No PHI in logs".

import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AuditEntry, Evidence, OrgId, EncounterId } from "@helix/shared";
import { evidenceSchema } from "@helix/shared";

// Sentinel written in place of any redacted value.
export const REDACTED = "[REDACTED]";

// Field names that carry human-readable PHI (Data Privacy Act sensitive
// personal information). Their VALUES are masked before an entry is stored.
// ID references (patientId, encounterId, memberId as a lookup key) are kept
// as references per the minimization principle — it's the human-readable
// identifiers we must never persist to the audit trail.
export const DEFAULT_PHI_KEYS: readonly string[] = [
  "fullName",
  "fullname",
  "name",
  "patientName",
  "firstName",
  "lastName",
  "middleName",
  "birthDate",
  "birthdate",
  "dob",
  "sex",
  "gender",
  "address",
  "phone",
  "phoneNumber",
  "contactNumber",
  "mobile",
  "email",
  "diagnosis",
  "notes",
  "complaint",
];

// Boundary validation — never trust the caller's input shape.
const auditInputSchema = z.object({
  orgId: z.string().min(1),
  actorType: z.enum(["agent", "user", "system"]),
  actorId: z.string().min(1),
  action: z.string().min(1),
  encounterId: z.string().optional(),
  model: z.string().optional(),
  promptVersion: z.string().optional(),
  evidence: z.array(evidenceSchema).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type AuditInput = z.input<typeof auditInputSchema>;

export interface RedactOptions {
  /** Extra field names (merged with DEFAULT_PHI_KEYS) whose values to mask. */
  extraKeys?: readonly string[];
  /** Override the generated id (tests / deterministic ingestion). */
  id?: string;
  /** Override the timestamp; defaults to now (ISO). */
  at?: string;
}

// Immutable deep redaction: returns NEW structures, never mutates the input.
function redactValue(value: unknown, phiKeys: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, phiKeys));
  }
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      out[key] = phiKeys.has(key)
        ? REDACTED
        : redactValue(source[key], phiKeys);
    }
    return out;
  }
  return value;
}

/** Redact PHI from an arbitrary metadata object. Pure — input untouched. */
export function redactMetadata(
  metadata: Record<string, unknown>,
  extraKeys: readonly string[] = [],
): Record<string, unknown> {
  const phiKeys = new Set<string>([...DEFAULT_PHI_KEYS, ...extraKeys]);
  return redactValue(metadata, phiKeys) as Record<string, unknown>;
}

/**
 * Validate audit input, strip PHI from metadata, and build a complete,
 * immutable AuditEntry (generates id + timestamp). This is the ONLY
 * sanctioned way to construct an entry — it guarantees no raw PHI lands in
 * the trail.
 */
export function redact(input: AuditInput, options: RedactOptions = {}): AuditEntry {
  const parsed = auditInputSchema.parse(input);
  const metadata =
    parsed.metadata !== undefined
      ? redactMetadata(parsed.metadata, options.extraKeys)
      : undefined;

  const entry: AuditEntry = {
    id: options.id ?? randomUUID(),
    orgId: parsed.orgId as OrgId,
    actorType: parsed.actorType,
    actorId: parsed.actorId,
    action: parsed.action,
    at: options.at ?? new Date().toISOString(),
    ...(parsed.encounterId !== undefined
      ? { encounterId: parsed.encounterId as EncounterId }
      : {}),
    ...(parsed.model !== undefined ? { model: parsed.model } : {}),
    ...(parsed.promptVersion !== undefined
      ? { promptVersion: parsed.promptVersion }
      : {}),
    ...(parsed.evidence !== undefined
      ? { evidence: parsed.evidence as Evidence[] }
      : {}),
    ...(metadata !== undefined ? { metadata } : {}),
  };

  return Object.freeze(entry);
}

export interface AuditQuery {
  orgId?: OrgId;
  encounterId?: EncounterId;
  action?: string;
  actorId?: string;
}

/**
 * Append-only audit log. There is no update or delete — non-repudiation is
 * the point. `append` and `list` are the only operations.
 */
export interface AuditLog {
  /** Persist an entry. Returns the stored (frozen) entry. */
  append(entry: AuditEntry): AuditEntry;
  /** Convenience: build a redacted entry from raw input, then append it. */
  record(input: AuditInput, options?: RedactOptions): AuditEntry;
  /** Read entries (optionally filtered), newest-appended last. */
  list(query?: AuditQuery): readonly AuditEntry[];
  /** Total number of stored entries. */
  size(): number;
}

/**
 * In-memory append-only implementation for dev, tests, and the demo slice.
 * Entries are frozen on the way in and copied on the way out — callers can
 * never mutate the stored trail.
 */
export class InMemoryAuditLog implements AuditLog {
  #entries: AuditEntry[] = [];

  append(entry: AuditEntry): AuditEntry {
    const frozen = Object.isFrozen(entry) ? entry : Object.freeze({ ...entry });
    this.#entries.push(frozen);
    return frozen;
  }

  record(input: AuditInput, options?: RedactOptions): AuditEntry {
    return this.append(redact(input, options));
  }

  list(query: AuditQuery = {}): readonly AuditEntry[] {
    const filtered = this.#entries.filter((e) => {
      if (query.orgId !== undefined && e.orgId !== query.orgId) return false;
      if (query.encounterId !== undefined && e.encounterId !== query.encounterId)
        return false;
      if (query.action !== undefined && e.action !== query.action) return false;
      if (query.actorId !== undefined && e.actorId !== query.actorId) return false;
      return true;
    });
    return Object.freeze([...filtered]);
  }

  size(): number {
    return this.#entries.length;
  }
}
