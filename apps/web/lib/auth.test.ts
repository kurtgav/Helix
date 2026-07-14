import { describe, it, expect } from "vitest";
import { can } from "@helix/core";
import { resolveRole, roleDisplayName, DEMO_ROLES } from "./auth";

// Pure-logic coverage for the identity substrate. Cookie I/O (getSession /
// actorCan / setRoleAction) needs a request scope and is exercised by e2e, per
// the module's design — here we test the trust boundary (resolveRole) and the
// RBAC mapping those functions delegate to.

describe("resolveRole", () => {
  it("accepts every valid role unchanged", () => {
    // Arrange
    const roles = DEMO_ROLES;

    // Act + Assert
    for (const role of roles) {
      expect(resolveRole(role)).toBe(role);
    }
  });

  it("defaults to 'staff' when the cookie is absent", () => {
    // Arrange
    const raw = undefined;

    // Act
    const role = resolveRole(raw);

    // Assert — preserves the pre-auth demo default (front desk = staff)
    expect(role).toBe("staff");
  });

  it("defaults to 'staff' for an unrecognized or empty value", () => {
    // Arrange
    const bogus = ["", "root", "Admin", "superuser", "STAFF"];

    // Act + Assert — validation is exact and case-sensitive
    for (const value of bogus) {
      expect(resolveRole(value)).toBe("staff");
    }
  });
});

describe("actorCan RBAC mapping", () => {
  // actorCan(action) === can(getSession().role, action), and getSession().role
  // === resolveRole(cookie). These assertions exercise that exact composition
  // without the cookie hop, so they verify the real permission surface actorCan
  // enforces.

  it("denies a viewer the ability to approve an LOA", () => {
    // Arrange
    const role = resolveRole("viewer");

    // Act
    const allowed = can(role, "loa.approve");

    // Assert — a viewer is strictly read-only and can NEVER approve
    expect(allowed).toBe(false);
  });

  it("allows staff (the default) to run eligibility", () => {
    // Arrange — undefined cookie resolves to the staff default
    const role = resolveRole(undefined);

    // Act
    const allowed = can(role, "eligibility.run");

    // Assert
    expect(role).toBe("staff");
    expect(allowed).toBe(true);
  });

  it("denies a viewer eligibility.run but allows read", () => {
    // Arrange
    const role = resolveRole("viewer");

    // Act + Assert
    expect(can(role, "eligibility.run")).toBe(false);
    expect(can(role, "encounter.read")).toBe(true);
  });
});

describe("roleDisplayName", () => {
  it("labels staff as the front desk persona", () => {
    // Act + Assert — the example shape the (app) chrome renders
    expect(roleDisplayName("staff")).toBe("Front desk (staff)");
  });

  it("produces a label carrying the raw role for every demo role", () => {
    // Act + Assert
    for (const role of DEMO_ROLES) {
      expect(roleDisplayName(role)).toContain(`(${role})`);
    }
  });
});
