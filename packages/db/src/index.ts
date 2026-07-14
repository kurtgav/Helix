// @helix/db public surface: schema tables + enums, the lazy client, and the
// Drizzle-inferred Insert/Select row types for every table.

export * from "./schema";
export { getDb, closeDb, type HelixDb } from "./client";
export * from "./repositories";
export * from "./roi";
export * from "./history";
export { BufferedAuditLog, createBufferedAuditLog } from "./audit";

/** True when a database is configured; the app persists only when this holds. */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
}

import type {
  orgs,
  users,
  payers,
  patients,
  coverage,
  services,
  encounters,
  eligibilityChecks,
  loaRequests,
  documents,
  auditLog,
} from "./schema";

// Select (row read) types
export type Org = typeof orgs.$inferSelect;
export type User = typeof users.$inferSelect;
export type Payer = typeof payers.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Coverage = typeof coverage.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Encounter = typeof encounters.$inferSelect;
export type EligibilityCheck = typeof eligibilityChecks.$inferSelect;
export type LoaRequest = typeof loaRequests.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;

// Insert (row write) types
export type NewOrg = typeof orgs.$inferInsert;
export type NewUser = typeof users.$inferInsert;
export type NewPayer = typeof payers.$inferInsert;
export type NewPatient = typeof patients.$inferInsert;
export type NewCoverage = typeof coverage.$inferInsert;
export type NewService = typeof services.$inferInsert;
export type NewEncounter = typeof encounters.$inferInsert;
export type NewEligibilityCheck = typeof eligibilityChecks.$inferInsert;
export type NewLoaRequest = typeof loaRequests.$inferInsert;
export type NewDocument = typeof documents.$inferInsert;
export type NewAuditEntry = typeof auditLog.$inferInsert;
