// Fixture schema — payer data (member records + plan rules) is EXTERNAL input
// to this package, so we validate it at load time. A malformed fixture must
// fail loudly, never silently produce wrong coverage answers.

import { z } from "zod";
import {
  serviceCategorySchema,
  requirementTypeSchema,
} from "@helix/shared";

export const fixtureMemberSchema = z.object({
  memberId: z.string().min(1),
  fullName: z.string().min(1),
  planName: z.string().min(1),
  status: z.enum(["active", "inactive", "unknown"]),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
});
export type FixtureMember = z.infer<typeof fixtureMemberSchema>;

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
});
export type PayerFixture = z.infer<typeof payerFixtureSchema>;
