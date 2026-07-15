// Receivables Agent (catalog #3) — public API for the payer-accountability
// teammate. Deterministic ledger assessment against each payer's own payment
// window + measured payer scorecards + collections forecast + cited follow-up
// draft, gated by RBAC and human approval, with a citations-only audit trail.
// Administrative only: no entitlement asserted, no invented payer rules, no
// clinical reasoning. Same substrate as the other agents.

export {
  runReceivables,
  resolveReceivables,
  scoreLedgerConfidence,
  RECEIVABLES_ACTION_KIND,
  type ReceivablesResolution,
} from "./agent";

export {
  assessReceivables,
  buildScorecards,
  forecastCashflow,
  ledgerAsOf,
  RECEIVABLES_POLICY_SOURCE,
} from "./ledger";

export { draftFollowUp } from "./draft";

export type { ReceivablesContext } from "./context";
