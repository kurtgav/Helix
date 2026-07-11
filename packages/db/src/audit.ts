// Postgres-backed audit log. The @helix/core AuditLog.record() is SYNCHRONOUS
// (agents call it without awaiting), so entries are collected in a buffer during
// the agent run and flushed to the append-only audit_log table afterward. This
// keeps the interface intact while guaranteeing durable, ordered persistence.

import {
  redact,
  type AuditLog,
  type AuditInput,
  type AuditQuery,
  type RedactOptions,
} from "@helix/core";
import type { AuditEntry } from "@helix/shared";
import { getDb } from "./client";
import { auditLog } from "./schema";

export class BufferedAuditLog implements AuditLog {
  private entries: AuditEntry[] = [];

  append(entry: AuditEntry): AuditEntry {
    const frozen = Object.isFrozen(entry) ? entry : Object.freeze({ ...entry });
    this.entries.push(frozen);
    return frozen;
  }

  record(input: AuditInput, options?: RedactOptions): AuditEntry {
    return this.append(redact(input, options));
  }

  list(query: AuditQuery = {}): readonly AuditEntry[] {
    const filtered = this.entries.filter((e) => {
      if (query.orgId !== undefined && e.orgId !== query.orgId) return false;
      if (query.encounterId !== undefined && e.encounterId !== query.encounterId) return false;
      if (query.action !== undefined && e.action !== query.action) return false;
      if (query.actorId !== undefined && e.actorId !== query.actorId) return false;
      return true;
    });
    return Object.freeze([...filtered]);
  }

  size(): number {
    return this.entries.length;
  }

  /** Persist buffered entries to the append-only audit_log (INSERT only), then clear. */
  async flush(): Promise<void> {
    if (this.entries.length === 0) return;
    const rows = this.entries.map((e) => ({
      id: e.id,
      orgId: e.orgId,
      actorType: e.actorType,
      actorId: e.actorId,
      action: e.action,
      encounterId: e.encounterId ?? null,
      model: e.model ?? null,
      promptVersion: e.promptVersion ?? null,
      evidence: e.evidence ?? null,
      metadata: e.metadata ?? null,
      at: new Date(e.at),
    }));
    await getDb().insert(auditLog).values(rows);
    this.entries = [];
  }
}

export function createBufferedAuditLog(): BufferedAuditLog {
  return new BufferedAuditLog();
}
