import { z } from "zod";

// Validate at every boundary — never trust user input OR raw LLM output.

export const sexSchema = z.enum(["M", "F", "X"]);

export const serviceCategorySchema = z.enum([
  "consult",
  "laboratory",
  "imaging",
  "procedure",
  "dialysis",
  "dental",
  "other",
]);

// Intake — the few fields a front-desk staffer types.
// Upper bounds at the boundary: reject oversized free-text before it is
// processed or persisted (storage/cost abuse control; no realistic intake field
// approaches these caps). Mirrors the .max() discipline already on the approve route.
export const intakeInputSchema = z.object({
  patient: z.object({
    fullName: z.string().min(1).max(200),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected yyyy-mm-dd"),
    sex: sexSchema,
  }),
  coverage: z.object({
    payerId: z.string().min(1).max(64),
    memberId: z.string().min(1).max(100),
    planName: z.string().min(1).max(120),
  }),
  service: z.object({
    code: z.string().min(1).max(64),
    name: z.string().min(1).max(200),
    category: serviceCategorySchema,
  }),
});
export type IntakeInput = z.infer<typeof intakeInputSchema>;

// Schemas to re-validate model-produced structures before we trust them.
export const requirementTypeSchema = z.enum([
  "loa",
  "referral",
  "valid_id",
  "member_id",
  "doctor_request",
  "consult_first",
  "other",
]);

export const requirementSchema = z.object({
  type: requirementTypeSchema,
  label: z.string(),
  required: z.boolean(),
  present: z.boolean(),
  note: z.string().optional(),
});

export const gapSchema = z.object({
  kind: z.string(),
  message: z.string(),
  blocking: z.boolean(),
});

export const evidenceSchema = z.object({
  source: z.string(),
  ref: z.string(),
  snippet: z.string().optional(),
});

export const eligibilityResultSchema = z.object({
  status: z.enum(["eligible", "ineligible", "needs_review"]),
  benefit: z.string().optional(),
  requirements: z.array(requirementSchema),
  gaps: z.array(gapSchema),
  evidence: z.array(evidenceSchema),
  checkedAt: z.string(),
});
