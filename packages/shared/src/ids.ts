// Branded ID types — compile-time safety so a PatientId can never be
// silently passed where an OrgId is expected. Erased at runtime.

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type OrgId = Brand<string, "OrgId">;
export type UserId = Brand<string, "UserId">;
export type PatientId = Brand<string, "PatientId">;
export type CoverageId = Brand<string, "CoverageId">;
export type EncounterId = Brand<string, "EncounterId">;
export type PayerId = Brand<string, "PayerId">;
export type EligibilityCheckId = Brand<string, "EligibilityCheckId">;
export type LOARequestId = Brand<string, "LOARequestId">;
export type DocumentId = Brand<string, "DocumentId">;
export type AuditId = Brand<string, "AuditId">;
