// RBAC — role → permission matrix with least-privilege defaults.
// Every agent action and API request authorizes here before it runs.
// See brain/security-and-compliance: "RBAC + least privilege".

import type { Role } from "@helix/shared";
import { err, ok, type Result } from "@helix/shared";

// The full set of authorizable actions in the v0 substrate. Adding an action
// here forces every role's grant to be considered explicitly (least privilege).
export const ACTIONS = [
  "encounter.read",
  "encounter.create",
  "eligibility.run",
  "loa.draft",
  "loa.submit",
  "loa.approve",
  "revenue.review",
  "revenue.resolve",
  "metrics.read",
  "audit.read",
  "user.manage",
  "org.manage",
] as const;

export type Action = (typeof ACTIONS)[number];

// Least-privilege matrix. Each role lists ONLY the actions it may perform.
// Roles are additive by convention (owner ⊇ admin ⊇ staff ⊇ viewer) but each
// grant is spelled out so a review reads the true surface, not an inheritance
// chain. A viewer is strictly read-only and can NEVER approve.
const VIEWER: readonly Action[] = [
  "encounter.read",
  "metrics.read",
  "revenue.review",
];

const STAFF: readonly Action[] = [
  ...VIEWER,
  "encounter.create",
  "eligibility.run",
  "loa.draft",
  "loa.submit",
  "loa.approve",
  "revenue.resolve",
];

const ADMIN: readonly Action[] = [...STAFF, "audit.read", "user.manage"];

const OWNER: readonly Action[] = [...ADMIN, "org.manage"];

const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Action[]>> = Object.freeze({
  viewer: Object.freeze([...VIEWER]),
  staff: Object.freeze([...STAFF]),
  admin: Object.freeze([...ADMIN]),
  owner: Object.freeze([...OWNER]),
});

/** Returns the frozen permission set granted to a role. */
export function permissionsFor(role: Role): readonly Action[] {
  return ROLE_PERMISSIONS[role];
}

/** Pure predicate: may this role perform this action? */
export function can(role: Role, action: Action): boolean {
  return ROLE_PERMISSIONS[role].includes(action);
}

/**
 * Result-returning authorization check for use across package boundaries.
 * No thrown control flow — callers branch on `ok`.
 */
export function authorize(role: Role, action: Action): Result<true> {
  if (can(role, action)) {
    return ok<true>(true);
  }
  return err({
    code: "forbidden",
    message: `Role '${role}' is not permitted to perform '${action}'.`,
    details: { role, action },
  });
}

/** Raised by assertCan when a role lacks a permission. */
export class AuthorizationError extends Error {
  readonly code = "forbidden";
  readonly role: Role;
  readonly action: Action;

  constructor(role: Role, action: Action) {
    super(`Role '${role}' is not permitted to perform '${action}'.`);
    this.name = "AuthorizationError";
    this.role = role;
    this.action = action;
  }
}

/** Throwing guard for imperative call sites. Throws AuthorizationError. */
export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) {
    throw new AuthorizationError(role, action);
  }
}
