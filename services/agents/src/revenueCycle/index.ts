// Revenue Cycle Agent (catalog #2) — public API for the denial-triage teammate.
// Deterministic triage + cited resubmission draft, gated by RBAC and human
// approval, with a citations-only audit trail. Administrative only: no clinical
// reasoning, no invented payer rules. Same substrate as the Eligibility agent.

export {
  runRevenueCycle,
  resolveRevenueCycle,
  scoreTriageConfidence,
  REVENUE_CYCLE_ACTION_KIND,
  type RevenueCycleResolution,
} from "./agent";

export { triageDenials, assessRisk, REVENUE_POLICY_SOURCE } from "./triage";

export { draftResubmission } from "./draft";

export type { RevenueCycleContext } from "./context";
