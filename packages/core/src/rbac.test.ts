import { describe, it, expect } from "vitest";
import type { Role } from "@helix/shared";
import {
  can,
  assertCan,
  authorize,
  permissionsFor,
  AuthorizationError,
  ACTIONS,
} from "./rbac";

describe("rbac.can", () => {
  it("lets owner do everything including org.manage", () => {
    for (const action of ACTIONS) {
      expect(can("owner", action)).toBe(true);
    }
  });

  it("lets staff run eligibility and approve LOAs", () => {
    expect(can("staff", "eligibility.run")).toBe(true);
    expect(can("staff", "encounter.create")).toBe(true);
    expect(can("staff", "loa.approve")).toBe(true);
  });

  it("denies staff admin-only actions", () => {
    expect(can("staff", "user.manage")).toBe(false);
    expect(can("staff", "org.manage")).toBe(false);
    expect(can("staff", "audit.read")).toBe(false);
  });

  it("makes viewer strictly read-only", () => {
    expect(can("viewer", "encounter.read")).toBe(true);
    expect(can("viewer", "metrics.read")).toBe(true);
    expect(can("viewer", "encounter.create")).toBe(false);
    expect(can("viewer", "eligibility.run")).toBe(false);
  });

  it("NEVER lets a viewer approve an LOA", () => {
    expect(can("viewer", "loa.approve")).toBe(false);
  });

  it("gates the company brain at staff+ (viewer denied)", () => {
    expect(can("viewer", "brain.read")).toBe(false);
    expect(can("staff", "brain.read")).toBe(true);
    expect(can("admin", "brain.read")).toBe(true);
    expect(can("owner", "brain.read")).toBe(true);
  });

  it("grants admin user + audit management but not org.manage", () => {
    expect(can("admin", "user.manage")).toBe(true);
    expect(can("admin", "audit.read")).toBe(true);
    expect(can("admin", "org.manage")).toBe(false);
  });
});

describe("rbac.authorize (Result)", () => {
  it("returns ok(true) when permitted", () => {
    const result = authorize("staff", "loa.draft");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(true);
  });

  it("returns a forbidden error when denied", () => {
    const result = authorize("viewer", "loa.approve");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("forbidden");
      expect(result.error.message).toContain("loa.approve");
    }
  });
});

describe("rbac.assertCan", () => {
  it("does not throw when permitted", () => {
    expect(() => assertCan("owner", "org.manage")).not.toThrow();
  });

  it("throws AuthorizationError when a viewer tries to approve", () => {
    expect(() => assertCan("viewer", "loa.approve")).toThrow(AuthorizationError);
    try {
      assertCan("viewer", "loa.approve");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthorizationError);
      if (error instanceof AuthorizationError) {
        expect(error.code).toBe("forbidden");
        expect(error.role).toBe("viewer");
        expect(error.action).toBe("loa.approve");
      }
    }
  });
});

describe("rbac.permissionsFor immutability", () => {
  it("returns a frozen permission set", () => {
    const perms = permissionsFor("staff");
    expect(Object.isFrozen(perms)).toBe(true);
  });

  it("keeps role permissions least-privilege ordered (viewer ⊂ staff ⊂ admin ⊂ owner)", () => {
    const size = (r: Role) => permissionsFor(r).length;
    expect(size("viewer")).toBeLessThan(size("staff"));
    expect(size("staff")).toBeLessThan(size("admin"));
    expect(size("admin")).toBeLessThan(size("owner"));
  });
});
