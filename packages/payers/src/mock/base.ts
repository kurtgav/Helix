// MockPayerAdapter — a deterministic PayerAdapter driven entirely by a
// validated fixture. Both PhilHealth and Maxicare mocks reuse this (DRY); only
// their fixture data differs. No network, no randomness — same input, same
// output, every run. All coverage answers cite the fixture as Evidence.

import {
  ok,
  err,
  type Result,
  type Evidence,
  type Requirement,
  type Service,
  type EligibilityStatus,
  type LOAStatus,
  type PayerId,
} from "@helix/shared";
import {
  eligibilityQuerySchema,
  loaDraftSchema,
  type PayerAdapter,
  type EligibilityQuery,
  type EligibilityCheck,
  type LOADraft,
  type LOASubmission,
} from "../adapter";
import {
  payerFixtureSchema,
  type PayerFixture,
  type FixturePlanRule,
} from "../fixtures/schema";

/** djb2 — tiny stable string hash for deterministic mock references. */
function stableHash(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0; // unsigned 32-bit
}

export class MockPayerAdapter implements PayerAdapter {
  readonly payerId: PayerId;
  readonly payerName: string;
  private readonly fixture: PayerFixture;

  constructor(rawFixture: unknown) {
    // Validate external fixture data at the boundary — fail loudly if malformed.
    this.fixture = payerFixtureSchema.parse(rawFixture);
    this.payerId = this.fixture.payerId as PayerId;
    this.payerName = this.fixture.payerName;
  }

  private ruleFor(category: Service["category"]): FixturePlanRule | undefined {
    return this.fixture.rules.find((rule) => rule.category === category);
  }

  private ruleEvidence(rule: FixturePlanRule): Evidence {
    return {
      source: `payer:${this.fixture.payerId}/rules`,
      ref: rule.section,
      snippet: rule.benefit,
    };
  }

  async checkEligibility(
    query: EligibilityQuery,
  ): Promise<Result<EligibilityCheck>> {
    const parsed = eligibilityQuerySchema.safeParse(query);
    if (!parsed.success) {
      return err({
        code: "invalid_input",
        message: "Eligibility query failed validation",
        details: parsed.error.flatten(),
      });
    }
    const { memberId, service } = parsed.data;

    const member = this.fixture.members.find((m) => m.memberId === memberId);
    if (!member) {
      // Not a coverage decision — a data gap the human must resolve.
      return ok({
        status: "needs_review" satisfies EligibilityStatus,
        evidence: [
          {
            source: `payer:${this.fixture.payerId}/members`,
            ref: `#${memberId}`,
            snippet: "No matching member record found in payer directory.",
          },
        ],
      });
    }

    const status: EligibilityStatus =
      member.status === "active" ? "eligible" : "ineligible";

    const evidence: Evidence[] = [
      {
        source: `payer:${this.fixture.payerId}/members`,
        ref: `#${member.memberId}`,
        snippet: `${member.fullName} — ${member.planName} — ${member.status}`,
      },
    ];

    const rule = this.ruleFor(service.category);
    if (rule) evidence.push(this.ruleEvidence(rule));

    return ok({ status, benefit: rule?.benefit, evidence });
  }

  async getRequirements(
    service: Service,
    plan: string,
  ): Promise<Result<Requirement[]>> {
    if (!service?.category) {
      return err({
        code: "invalid_input",
        message: "Service with a category is required",
      });
    }

    const rule = this.ruleFor(service.category);
    if (!rule) {
      // Unknown category for this payer → surface as needs-review upstream,
      // never fabricate a requirement list.
      return ok([]);
    }

    const requirements: Requirement[] = rule.requiredDocs.map((doc) => ({
      type: doc.type,
      label: doc.label,
      required: true,
      // The adapter knows the RULE, not which docs are physically present;
      // the agent reconciles `present` against uploaded documents.
      present: false,
      note: `${this.fixture.payerName} · ${plan} · ${service.category}`,
    }));

    return ok(requirements);
  }

  async submitLOA(draft: LOADraft): Promise<Result<LOASubmission>> {
    const parsed = loaDraftSchema.safeParse(draft);
    if (!parsed.success) {
      return err({
        code: "invalid_input",
        message: "LOA draft failed validation",
        details: parsed.error.flatten(),
      });
    }
    const { memberId, serviceCode, serviceCategory } = parsed.data;

    // Base36 keeps the reference compact and alphanumeric. Deliberately NOT a
    // long decimal run: a 9–10 digit number reads like a PhilHealth/SSS/member
    // identifier to both humans and PHI scanners (the console e2e treats long
    // digit runs as potential identifiers), and a payer reference must never
    // masquerade as one.
    const ref = `${this.fixture.payerId.toUpperCase()}-LOA-${stableHash(
      `${memberId}:${serviceCode}`,
    )
      .toString(36)
      .toUpperCase()}`;

    const rule = this.ruleFor(serviceCategory);
    const evidence: Evidence[] = rule
      ? [this.ruleEvidence(rule)]
      : [
          {
            source: `payer:${this.fixture.payerId}/rules`,
            ref: `#${serviceCategory}`,
            snippet: "Submitted against payer rule set (mock).",
          },
        ];

    return ok({
      externalRef: ref,
      status: "submitted" satisfies LOAStatus,
      evidence,
    });
  }

  async getStatus(ref: string): Promise<Result<LOAStatus>> {
    if (typeof ref !== "string" || ref.trim().length === 0) {
      return err({
        code: "invalid_input",
        message: "A non-empty LOA reference is required",
      });
    }

    // Deterministic mock progression: even hash → approved, odd → still pending.
    const status: LOAStatus = stableHash(ref) % 2 === 0 ? "approved" : "submitted";
    return ok(status);
  }
}
