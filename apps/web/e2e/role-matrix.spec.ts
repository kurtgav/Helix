import { test, expect } from "@playwright/test";

// The full role × capability matrix, proven end-to-end at the API seam. The
// other RBAC specs prove staff (happy path) and viewer (denied); this one
// closes the matrix so EVERY role's real capability set is exercised, not
// inferred from the additive convention (owner ⊇ admin ⊇ staff ⊇ viewer).
//
// API-level on purpose: the UI specs already prove the surfaces render; what
// must hold per role is the server-side authorization outcome.

const AUTH_COOKIE = "helix_role";

const VALID_INTAKE = {
  patient: { fullName: "Juan Dela Cruz", birthDate: "1990-04-12", sex: "M" },
  coverage: {
    payerId: "maxicare",
    memberId: "MX-0098-2231",
    planName: "Maxicare Prima",
  },
  service: { code: "MRI-BRAIN", name: "MRI (Brain, plain)", category: "imaging" },
};

// Distinct rate-limit buckets per role group (lib/rateLimit.ts keys on the
// first x-forwarded-for hop; 30 req/60s per key) so matrix POSTs never 429.
const BUCKETS: Record<string, string> = {
  staff: "203.0.113.51",
  admin: "203.0.113.52",
  owner: "203.0.113.53",
  viewer: "203.0.113.54",
};

for (const role of ["staff", "admin", "owner"] as const) {
  test.describe(`role matrix — ${role} (working roles)`, () => {
    test.use({ extraHTTPHeaders: { "x-forwarded-for": BUCKETS[role]! } });

    test(`${role} completes verify → approve and reads brain + revenue`, async ({
      request,
    }) => {
      const cookie = `${AUTH_COOKIE}=${role}`;

      // 1) eligibility.run — the full agent proposal comes back, with the
      //    policy-intelligence checks attached and cited.
      const verify = await request.post("/api/verify", {
        headers: { cookie },
        data: VALID_INTAKE,
      });
      expect(verify.status()).toBe(200);
      const proposal = await verify.json();
      expect(proposal.success).toBe(true);
      expect(proposal.data.requiresApproval).toBe(true);
      expect(proposal.data.eligibility.policyChecks.length).toBeGreaterThan(0);
      const encounterId = proposal.data.encounterId as string;
      expect(encounterId).toBeTruthy();

      // 2) loa.approve — the human-in-the-loop gate accepts this role's decision.
      const approve = await request.post("/api/approve", {
        headers: { cookie },
        data: { encounterId, decision: "approved" },
      });
      expect(approve.status()).toBe(200);
      const approved = await approve.json();
      expect(approved.success).toBe(true);
      expect(approved.data.decision).toBe("approved");

      // 3) brain.read — company memory is readable by every working role.
      const brain = await request.get("/brain", { headers: { cookie } });
      expect(brain.status()).toBe(200);

      // 4) revenue.review — the triage surface renders for this role.
      const revenue = await request.get("/revenue", { headers: { cookie } });
      expect(revenue.status()).toBe(200);
    });
  });
}

test.describe("role matrix — viewer (strictly read-only)", () => {
  test.use({ extraHTTPHeaders: { "x-forwarded-for": BUCKETS.viewer! } });

  test("viewer reads surfaces but every mutating capability 403s", async ({
    request,
  }) => {
    const cookie = `${AUTH_COOKIE}=viewer`;

    // Reads that a viewer legitimately holds (encounter.read, metrics.read,
    // revenue.review) keep working…
    for (const path of ["/dashboard", "/console", "/revenue"]) {
      const res = await request.get(path, { headers: { cookie } });
      expect(res.status(), `${path} should render for viewer`).toBe(200);
    }

    // …while both mutating capabilities are refused by the SERVER.
    const verify = await request.post("/api/verify", {
      headers: { cookie },
      data: VALID_INTAKE,
    });
    expect(verify.status()).toBe(403);

    const approve = await request.post("/api/approve", {
      headers: { cookie },
      data: { encounterId: "enc_any", decision: "approved" },
    });
    expect(approve.status()).toBe(403);
  });
});
