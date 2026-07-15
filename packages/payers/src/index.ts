// @helix/payers — pluggable payer adapters behind one interface (repository
// pattern). Mock adapters ship first, driven by fixtures; live integrations
// swap in behind a flag once rules are confirmed. ADMINISTRATIVE only.

export type {
  PayerAdapter,
  EligibilityQuery,
  EligibilityCheck,
  LOADraft,
  LOASubmission,
} from "./adapter";
export { eligibilityQuerySchema, loaDraftSchema } from "./adapter";

export { MockPayerAdapter } from "./mock/base";
export { createMaxicareAdapter } from "./mock/maxicare";
export { createPhilHealthAdapter } from "./mock/philhealth";

export {
  getAdapter,
  listPayerIds,
  NotImplementedError,
  UnknownPayerError,
} from "./registry";

export type {
  PayerFixture,
  FixtureMember,
  FixturePlanRule,
  FixturePlanPolicy,
} from "./fixtures/schema";
export { payerFixtureSchema } from "./fixtures/schema";

export type { RegulatoryRule, RuleConfidence } from "./knowledge/phRules";
export {
  PHILHEALTH_CLAIM_FILING,
  PHILHEALTH_APPEAL,
  PHILHEALTH_RTH_REFILE,
  HMO_CLAIM_FILING,
  HMO_APPEAL,
  HMO_LOA_VALIDITY,
  IC_PEC_STANDARDS,
  listRules,
  claimFilingRule,
  appealRule,
  refileRule,
  ruleEvidence,
  pecStandardsEvidence,
  assessDeadline,
  daysBetween,
  toUtcDay,
} from "./knowledge/phRules";
