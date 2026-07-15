// Fixture schema — payer data (member records + plan rules) is EXTERNAL input
// to this package, so we validate it at load time. A malformed fixture must
// fail loudly, never silently produce wrong coverage answers.

import { z } from "zod";
import {
  serviceCategorySchema,
  requirementTypeSchema,
  policyTypeSchema,
} from "@helix/shared";

export const fixtureMemberSchema = z.object({
  memberId: z.string().min(1),
  fullName: z.string().min(1),
  planName: z.string().min(1),
  status: z.enum(["active", "inactive", "unknown"]),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  // --- policy intelligence (optional, additive) ---
  policyType: policyTypeSchema.optional(),
  /** When this member's policy took effect (waiting-period anchor). */
  effectiveDate: z.string().optional(),
  /** Benefit already consumed against the plan MBL, in PHP. */
  usedBenefitPhp: z.number().nonnegative().optional(),
});
export type FixtureMember = z.infer<typeof fixtureMemberSchema>;

// Plan-level policy terms — the payer-declared rules the policy engine cites.
// Optional block: fixtures without it keep today's behavior.
export const fixturePlanPolicySchema = z.object({
  planName: z.string().min(1),
  policyType: policyTypeSchema,
  /** Days after effectiveDate before non-emergency availment is covered. */
  waitingPeriodDays: z.number().int().nonnegative().optional(),
  /** Months pre-existing conditions stay excluded (individual plans). */
  pecExclusionMonths: z.number().int().nonnegative().optional(),
  /** True when the plan covers pre-existing conditions (typical group waiver). */
  pecCovered: z.boolean().optional(),
  /** Maximum benefit limit per illness/year, in PHP. */
  mblPhp: z.number().positive().optional(),
  /** Days an issued LOA stays valid. */
  loaValidityDays: z.number().int().positive().optional(),
  // Evidence anchor within the payer policy doc, e.g. "#individual-terms".
  section: z.string().min(1),
});
export type FixturePlanPolicy = z.infer<typeof fixturePlanPolicySchema>;

export const fixtureRequiredDocSchema = z.object({
  type: requirementTypeSchema,
  label: z.string().min(1),
});

export const fixturePlanRuleSchema = z.object({
  category: serviceCategorySchema,
  requiresLOA: z.boolean(),
  benefit: z.string().min(1),
  requiredDocs: z.array(fixtureRequiredDocSchema),
  // Evidence anchor within the payer rule doc, e.g. "#imaging".
  section: z.string().min(1),
});
export type FixturePlanRule = z.infer<typeof fixturePlanRuleSchema>;

export const payerFixtureSchema = z.object({
  payerId: z.string().min(1),
  payerName: z.string().min(1),
  members: z.array(fixtureMemberSchema),
  rules: z.array(fixturePlanRuleSchema),
  planPolicies: z.array(fixturePlanPolicySchema).optional(),
});
export type PayerFixture = z.infer<typeof payerFixtureSchema>;
