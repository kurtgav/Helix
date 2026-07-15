// Helix Postgres schema (Drizzle) — the persistence shape for the @helix/shared
// ADMINISTRATIVE domain. Every pgEnum mirrors a string-literal union in
// @helix/shared so the DB can never drift from the contract. Typed queries via
// Drizzle keep us injection-safe (see brain/security-and-compliance).

import type {
  Requirement,
  Gap,
  Evidence,
  PolicyCheck,
} from "@helix/shared";
import { sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  date,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// --- Enums (mirror @helix/shared unions exactly) ---
export const roleEnum = pgEnum("role", ["owner", "admin", "staff", "viewer"]);
export const payerKindEnum = pgEnum("payer_kind", ["philhealth", "hmo"]);
export const adapterModeEnum = pgEnum("adapter_mode", ["mock", "live"]);
export const sexEnum = pgEnum("sex", ["M", "F", "X"]);
export const coverageStatusEnum = pgEnum("coverage_status", [
  "active",
  "inactive",
  "unknown",
]);
export const serviceCategoryEnum = pgEnum("service_category", [
  "consult",
  "laboratory",
  "imaging",
  "procedure",
  "dialysis",
  "dental",
  "other",
]);
export const eligibilityStatusEnum = pgEnum("eligibility_status", [
  "eligible",
  "ineligible",
  "needs_review",
]);
export const loaStatusEnum = pgEnum("loa_status", [
  "draft",
  "ready",
  "submitted",
  "approved",
  "denied",
]);
export const encounterStatusEnum = pgEnum("encounter_status", [
  "intake",
  "verifying",
  "awaiting_approval",
  "approved",
  "rejected",
  "closed",
]);
export const actorTypeEnum = pgEnum("actor_type", ["agent", "user", "system"]);

// --- Organizations (tenant root; every row is org-scoped for RLS) ---
export const orgs = pgTable("orgs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Users (+ RBAC role) ---
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    role: roleEnum("role").notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_unique").on(t.email),
    index("users_org_idx").on(t.orgId),
  ],
);

// --- Payers (PhilHealth + HMOs: Maxicare/Intellicare/Medicard/...) ---
export const payers = pgTable("payers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kind: payerKindEnum("kind").notNull(),
  mode: adapterModeEnum("mode").notNull().default("mock"),
});

// --- Patients ---
export const patients = pgTable(
  "patients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    birthDate: date("birth_date").notNull(), // ISO yyyy-mm-dd
    sex: sexEnum("sex").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("patients_org_idx").on(t.orgId)],
);

// --- Coverage (a patient's membership under a payer) ---
export const coverage = pgTable(
  "coverage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    payerId: uuid("payer_id")
      .notNull()
      .references(() => payers.id, { onDelete: "restrict" }),
    memberId: text("member_id").notNull(),
    planName: text("plan_name").notNull(),
    status: coverageStatusEnum("status").notNull().default("unknown"),
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
  },
  (t) => [
    index("coverage_patient_idx").on(t.patientId),
    index("coverage_payer_idx").on(t.payerId),
  ],
);

// --- Services catalog (code is the natural key; e.g. MRI-BRAIN, CBC) ---
export const services = pgTable("services", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  category: serviceCategoryEnum("category").notNull(),
});

// --- Encounters (the unit an agent acts on) ---
export const encounters = pgTable(
  "encounters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "restrict" }),
    coverageId: uuid("coverage_id")
      .notNull()
      .references(() => coverage.id, { onDelete: "restrict" }),
    serviceCode: text("service_code")
      .notNull()
      .references(() => services.code, { onDelete: "restrict" }),
    status: encounterStatusEnum("status").notNull().default("intake"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("encounters_org_idx").on(t.orgId),
    index("encounters_patient_idx").on(t.patientId),
  ],
);

// --- Eligibility checks (persisted EligibilityResult per encounter) ---
export const eligibilityChecks = pgTable(
  "eligibility_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    encounterId: uuid("encounter_id")
      .notNull()
      .references(() => encounters.id, { onDelete: "cascade" }),
    status: eligibilityStatusEnum("status").notNull(),
    benefit: text("benefit"),
    requirements: jsonb("requirements")
      .$type<Requirement[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    gaps: jsonb("gaps")
      .$type<Gap[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    evidence: jsonb("evidence")
      .$type<Evidence[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    // Measured wall-clock latency of the verify run that produced this check.
    // Nullable: rows written before measurement shipped (or by paths that
    // cannot time themselves) stay honest — the ROI aggregator substitutes its
    // documented default instead of us inventing a number.
    durationMs: integer("duration_ms"),
    // Deterministic policy-intelligence checks (coverage window, waiting
    // period, PEC, benefit limit, filing window). Nullable: rows written
    // before the policy layer shipped simply have none.
    policyChecks: jsonb("policy_checks").$type<PolicyCheck[]>(),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("eligibility_checks_encounter_idx").on(t.encounterId)],
);

// --- LOA / pre-authorization requests ---
export const loaRequests = pgTable(
  "loa_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    encounterId: uuid("encounter_id")
      .notNull()
      .references(() => encounters.id, { onDelete: "cascade" }),
    payerId: uuid("payer_id")
      .notNull()
      .references(() => payers.id, { onDelete: "restrict" }),
    serviceCode: text("service_code")
      .notNull()
      .references(() => services.code, { onDelete: "restrict" }),
    status: loaStatusEnum("status").notNull().default("draft"),
    body: text("body").notNull(),
    requiredDocs: jsonb("required_docs")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    missingDocs: jsonb("missing_docs")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("loa_requests_encounter_idx").on(t.encounterId)],
);

// --- Documents (encrypted object-store references, not blobs) ---
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    encounterId: uuid("encounter_id")
      .notNull()
      .references(() => encounters.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "referral" | "valid_id" | ...
    filename: text("filename").notNull(),
    storageKey: text("storage_key").notNull(), // encrypted object-store key
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("documents_encounter_idx").on(t.encounterId)],
);

// --- Audit log (APPEND-ONLY) ---
// This table is immutable by contract: application code INSERTs only, never
// UPDATE/DELETE. Enforce with a Postgres rule/trigger + role privileges at the
// DB layer (a REVOKE UPDATE, DELETE grant lives in the migration, not here).
// Every agent run and human approval records actor, action, model+prompt
// version, retrieved evidence, and timestamp. See brain/security-and-compliance.
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => orgs.id, { onDelete: "restrict" }),
    actorType: actorTypeEnum("actor_type").notNull(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(), // "eligibility.checked" | "loa.drafted" ...
    encounterId: uuid("encounter_id").references(() => encounters.id, {
      onDelete: "set null",
    }),
    model: text("model"),
    promptVersion: text("prompt_version"),
    evidence: jsonb("evidence").$type<Evidence[]>(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_org_idx").on(t.orgId),
    index("audit_log_encounter_idx").on(t.encounterId),
  ],
);
