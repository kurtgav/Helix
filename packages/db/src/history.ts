// Read-only history projections for the Operations Console. These are the
// PHI-minimized views the console renders: recent encounters (service, payer,
// status, time — deliberately NO patient name) and the immutable audit trail
// (actor/action/metadata, already PHI-free by contract). Typed Drizzle queries
// keep them injection-safe. Org-scoped. See brain/security-and-compliance.

import { and, desc, eq } from "drizzle-orm";
import type { EncounterStatus } from "@helix/shared";
import { getDb } from "./client";
import {
  auditLog,
  coverage,
  encounters,
  payers,
  services,
} from "./schema";

/** One row of the recent-activity table. No patient identity — minimized. */
export interface EncounterSummaryRow {
  id: string;
  serviceName: string;
  serviceCategory: string;
  payerName: string;
  status: EncounterStatus;
  createdAt: string; // ISO
}

/** Most recent encounters for an org, newest first. Patient name is never selected. */
export async function recentEncounters(
  orgId: string,
  limit = 20,
): Promise<EncounterSummaryRow[]> {
  const rows = await getDb()
    .select({
      id: encounters.id,
      serviceName: services.name,
      serviceCategory: services.category,
      payerName: payers.name,
      status: encounters.status,
      createdAt: encounters.createdAt,
    })
    .from(encounters)
    .innerJoin(services, eq(services.code, encounters.serviceCode))
    .innerJoin(coverage, eq(coverage.id, encounters.coverageId))
    .innerJoin(payers, eq(payers.id, coverage.payerId))
    .where(eq(encounters.orgId, orgId))
    .orderBy(desc(encounters.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    serviceName: r.serviceName,
    serviceCategory: r.serviceCategory,
    payerName: r.payerName,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** One row of the audit-trail viewer. Mirrors the append-only audit_log (PHI-free). */
export interface AuditTrailRow {
  id: string;
  actorType: "agent" | "user" | "system";
  actorId: string;
  action: string;
  encounterId: string | null;
  model: string | null;
  promptVersion: string | null;
  metadata: Record<string, unknown> | null;
  at: string; // ISO
}

/** Most recent audit entries for an org, newest first. Immutable by contract. */
export async function recentAuditEntries(
  orgId: string,
  limit = 30,
): Promise<AuditTrailRow[]> {
  const rows = await getDb()
    .select({
      id: auditLog.id,
      actorType: auditLog.actorType,
      actorId: auditLog.actorId,
      action: auditLog.action,
      encounterId: auditLog.encounterId,
      model: auditLog.model,
      promptVersion: auditLog.promptVersion,
      metadata: auditLog.metadata,
      at: auditLog.at,
    })
    .from(auditLog)
    .where(eq(auditLog.orgId, orgId))
    .orderBy(desc(auditLog.at))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    actorType: r.actorType,
    actorId: r.actorId,
    action: r.action,
    encounterId: r.encounterId,
    model: r.model,
    promptVersion: r.promptVersion,
    metadata: r.metadata ?? null,
    at: r.at.toISOString(),
  }));
}

/** Count of encounters in a status bucket for the console summary tiles. */
export async function countEncountersByStatus(
  orgId: string,
  status: EncounterStatus,
): Promise<number> {
  const rows = await getDb()
    .select({ id: encounters.id })
    .from(encounters)
    .where(and(eq(encounters.orgId, orgId), eq(encounters.status, status)));
  return rows.length;
}
