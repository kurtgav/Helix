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
} from "./fixtures/schema";
export { payerFixtureSchema } from "./fixtures/schema";
