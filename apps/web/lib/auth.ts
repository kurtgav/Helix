import "server-only";

// Demo identity substrate — a REAL RBAC seam wearing demo clothes.
//
// This module is the single place the web app answers "who is acting, and what
// may they do?". It is deliberately self-contained: identity is carried in one
// signed-by-nature httpOnly cookie (`helix_role`) instead of an external IdP, so
// the whole product is demoable offline with no auth infra. What is NOT fake is
// the authorization: getSession() → a Role, and every gate runs the SAME core
// RBAC matrix the agents use (packages/core/rbac). A `viewer` truly cannot
// approve an LOA here — assertActorCan("loa.approve") throws — exactly as it will
// in production. The demo is the *authentication*; the *authorization* is real.
//
// Production swap: replace the cookie read inside getSession()/requireActor()
// with a Supabase Auth session lookup (and setRoleAction with a real role grant).
// Every caller — route handlers, the (app) chrome, agent ctx — depends only on
// getSession()/requireActor()/actorCan()/assertActorCan(), so none of them change
// when the identity source does. That is the point of this seam.
//
// server-only: this file reads cookies and runs authorization; it must never be
// bundled to the client. The import on line 1 makes the bundler fail loudly if a
// Client Component ever imports it.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { can, assertCan, type Action } from "@helix/core";
import type { Role, UserId } from "@helix/shared";

// Re-exported so route handlers have one import site for the 403 path: catch
// AuthorizationError (thrown by assertActorCan) and map it to HTTP 403.
export { AuthorizationError } from "@helix/core";

/** Resolved identity for one request. `userId`/`orgId` are plain strings at this
 *  boundary; requireActor() re-brands them for the typed agent context. */
export interface Session {
  userId: string;
  role: Role;
  orgId: string;
  displayName: string;
}

/** Name of the cookie that carries the demo role. httpOnly + lax + (prod) secure. */
export const AUTH_COOKIE = "helix_role";

// The full role set, in privilege order (owner ⊇ admin ⊇ staff ⊇ viewer). This
// is the allowlist the demo role-switcher offers AND the validation set for the
// setRoleAction server action — nothing outside it can ever land in the cookie.
export const DEMO_ROLES: readonly Role[] = ["owner", "admin", "staff", "viewer"];

// Single demo actor. userId/role default MUST match the previous DEMO_ACTOR in
// lib/agents.ts ({ userId: "user_demo_frontdesk", role: "staff" }) so behavior is
// preserved when no cookie is present: front desk = staff.
const DEMO_USER_ID = "user_demo_frontdesk";
// Mirrors DEMO_ORG_ID in lib/demo.ts. Kept local (not imported) so the identity
// substrate stays decoupled from the ROI demo fixtures — a real deployment reads
// the org from the authenticated session, not from a seed file.
const DEMO_ORG_ID = "org_helix_diagnostics_makati";

// Human labels for the demo personas, so the role indicator/switcher reads like a
// product ("Front desk (staff)") rather than a bare enum.
const ROLE_LABELS: Readonly<Record<Role, string>> = {
  owner: "Clinic owner",
  admin: "Administrator",
  staff: "Front desk",
  viewer: "Read-only",
};

/** Pure: is this arbitrary string one of the four Roles? Type guard so callers
 *  narrow `string` → `Role` without a cast. */
function isRole(value: string): value is Role {
  return (DEMO_ROLES as readonly string[]).includes(value);
}

/** Friendly label for a role, e.g. "Front desk (staff)". Pure — safe for the
 *  (app) chrome to label each switcher option. */
export function roleDisplayName(role: Role): string {
  return `${ROLE_LABELS[role]} (${role})`;
}

/**
 * Validate a raw cookie value against the Role union. Absent or unrecognized →
 * "staff", which preserves the pre-auth demo default (front desk). PURE and total
 * — this is the unit-tested trust boundary between the untrusted cookie string
 * and the rest of the app, which only ever sees a valid Role.
 */
export function resolveRole(raw: string | undefined): Role {
  return raw !== undefined && isRole(raw) ? raw : "staff";
}

/**
 * Read the current identity from the request cookie. Runs in Server Components
 * and route handlers (both have a request scope for cookies()). The returned
 * role has already passed resolveRole, so downstream code never validates again.
 */
export function getSession(): Session {
  const raw = cookies().get(AUTH_COOKIE)?.value;
  const role = resolveRole(raw);
  return {
    userId: DEMO_USER_ID,
    role,
    orgId: DEMO_ORG_ID,
    displayName: roleDisplayName(role),
  };
}

/**
 * The actor shape the agent layer expects ({ userId, role }), with the branded
 * UserId restored. Route handlers pass this straight into the agent ctx so the
 * audit trail and RBAC inside the agents attribute to the acting session — not a
 * hardcoded constant.
 */
export function requireActor(): { userId: UserId; role: Role } {
  const session = getSession();
  return { userId: session.userId as UserId, role: session.role };
}

/** Non-throwing check: may the current actor perform `action`? Delegates to the
 *  core RBAC matrix — the same predicate the agents authorize with. */
export function actorCan(action: Action): boolean {
  return can(getSession().role, action);
}

/**
 * Throwing guard for route handlers: assert the current actor may perform
 * `action`, else throw AuthorizationError. The route catches it and returns HTTP
 * 403 with the ApiResponse error envelope. This is the enforcement point — the
 * client-side UI gate is cosmetic; THIS is what actually stops a viewer.
 */
export function assertActorCan(action: Action): void {
  assertCan(getSession().role, action);
}

/**
 * Server action powering the demo role-switcher. Writes the chosen role into the
 * httpOnly cookie, then revalidates the app shell so every server-rendered gate
 * re-reads the new identity immediately.
 *
 * SECURITY: a server action is a public endpoint — the `role` argument is
 * untrusted regardless of its TypeScript type, so it is re-validated against
 * DEMO_ROLES at runtime before it can reach the cookie. httpOnly keeps the cookie
 * out of document.cookie/JS (no XSS theft), sameSite "lax" blocks cross-site
 * submission, and `secure` is set in production so it only travels over HTTPS.
 */
export async function setRoleAction(role: Role): Promise<void> {
  "use server";

  if (!isRole(role)) {
    throw new Error("Unknown role.");
  }

  cookies().set(AUTH_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  // Re-render every route under the root layout so the role indicator and any
  // permission-gated UI reflect the switch without a manual reload.
  revalidatePath("/", "layout");
}
