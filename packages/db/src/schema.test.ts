import { describe, it, expect } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import {
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
  roleEnum,
  sexEnum,
  loaStatusEnum,
  encounterStatusEnum,
  serviceCategoryEnum,
} from "./index";

// Metadata-only assertions — no live DB connection is opened.

describe("schema table names", () => {
  it("maps each table to its snake_case SQL name", () => {
    expect(getTableName(orgs)).toBe("orgs");
    expect(getTableName(users)).toBe("users");
    expect(getTableName(payers)).toBe("payers");
    expect(getTableName(patients)).toBe("patients");
    expect(getTableName(coverage)).toBe("coverage");
    expect(getTableName(services)).toBe("services");
    expect(getTableName(encounters)).toBe("encounters");
    expect(getTableName(eligibilityChecks)).toBe("eligibility_checks");
    expect(getTableName(loaRequests)).toBe("loa_requests");
    expect(getTableName(documents)).toBe("documents");
    expect(getTableName(auditLog)).toBe("audit_log");
  });
});

describe("column presence", () => {
  it("users exposes RBAC role + org scope", () => {
    const cols = getTableColumns(users);
    expect(Object.keys(cols)).toEqual(
      expect.arrayContaining(["id", "orgId", "email", "fullName", "role", "createdAt"]),
    );
  });

  it("patients carries administrative identity fields", () => {
    const cols = getTableColumns(patients);
    expect(Object.keys(cols)).toEqual(
      expect.arrayContaining(["id", "orgId", "fullName", "birthDate", "sex", "createdAt"]),
    );
  });

  it("coverage links patient and payer with membership detail", () => {
    const cols = getTableColumns(coverage);
    expect(Object.keys(cols)).toEqual(
      expect.arrayContaining([
        "id",
        "patientId",
        "payerId",
        "memberId",
        "planName",
        "status",
        "validFrom",
        "validTo",
      ]),
    );
  });

  it("encounters reference org, patient, coverage and service", () => {
    const cols = getTableColumns(encounters);
    expect(Object.keys(cols)).toEqual(
      expect.arrayContaining([
        "id",
        "orgId",
        "patientId",
        "coverageId",
        "serviceCode",
        "status",
        "createdAt",
      ]),
    );
  });

  it("eligibility_checks persists the EligibilityResult shape", () => {
    const cols = getTableColumns(eligibilityChecks);
    expect(Object.keys(cols)).toEqual(
      expect.arrayContaining([
        "id",
        "encounterId",
        "status",
        "benefit",
        "requirements",
        "gaps",
        "evidence",
        "checkedAt",
      ]),
    );
  });

  it("loa_requests carries drafted body and doc tracking", () => {
    const cols = getTableColumns(loaRequests);
    expect(Object.keys(cols)).toEqual(
      expect.arrayContaining([
        "id",
        "encounterId",
        "payerId",
        "serviceCode",
        "status",
        "body",
        "requiredDocs",
        "missingDocs",
        "createdAt",
      ]),
    );
  });

  it("documents store encrypted object-store references only", () => {
    const cols = getTableColumns(documents);
    expect(Object.keys(cols)).toEqual(
      expect.arrayContaining(["id", "encounterId", "kind", "filename", "storageKey", "uploadedAt"]),
    );
  });

  it("audit_log captures actor, action, model and evidence", () => {
    const cols = getTableColumns(auditLog);
    expect(Object.keys(cols)).toEqual(
      expect.arrayContaining([
        "id",
        "orgId",
        "actorType",
        "actorId",
        "action",
        "encounterId",
        "model",
        "promptVersion",
        "evidence",
        "metadata",
        "at",
      ]),
    );
  });
});

describe("enums mirror @helix/shared unions", () => {
  it("role", () => {
    expect(roleEnum.enumValues).toEqual(["owner", "admin", "staff", "viewer"]);
  });
  it("sex", () => {
    expect(sexEnum.enumValues).toEqual(["M", "F", "X"]);
  });
  it("loa status", () => {
    expect(loaStatusEnum.enumValues).toEqual([
      "draft",
      "ready",
      "submitted",
      "approved",
      "denied",
    ]);
  });
  it("encounter status", () => {
    expect(encounterStatusEnum.enumValues).toEqual([
      "intake",
      "verifying",
      "awaiting_approval",
      "approved",
      "rejected",
      "closed",
    ]);
  });
  it("service category", () => {
    expect(serviceCategoryEnum.enumValues).toEqual([
      "consult",
      "laboratory",
      "imaging",
      "procedure",
      "dialysis",
      "dental",
      "other",
    ]);
  });
});

describe("eligibility_checks duration column (measured verify latency)", () => {
  it("exposes durationMs mapped to duration_ms, nullable for legacy rows", () => {
    const cols = getTableColumns(eligibilityChecks);
    expect(Object.keys(cols)).toEqual(
      expect.arrayContaining(["id", "encounterId", "status", "durationMs", "checkedAt"]),
    );
    expect(cols.durationMs.name).toBe("duration_ms");
    expect(cols.durationMs.notNull).toBe(false);
  });
});
