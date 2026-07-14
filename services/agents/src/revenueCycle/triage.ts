// Denial-triage rule engine — the deterministic reasoning core of the Revenue
// Cycle Agent. Given a batch of denied / at-risk claims it classifies each into
// a fixed, auditable taxonomy and decides, per claim:
//   - the recommended administrative recovery action,
//   - whether the money is recoverable (age-gated where the payer clock matters),
//   - the concrete fixes required before resubmission,
//   - the revenue risk tier (amount + age),
//   - a short, cited rationale.
//
// It is PURE and deterministic: no I/O, no LLM, no clinical judgment, and — most
// importantly — it invents NO payer rules. Every determination is administrative
// hygiene traceable to the Helix local policy source below. The agent layer
// (agent.ts) re-validates its input with zod and gates the result behind RBAC +
// human approval; this module just encodes the policy.

import type {
  DenialCase,
  DenialReason,
  RecoveryAction,
  RevenueRisk,
  RevenueCycleFinding,
} from "@helix/shared";

// Source label for the Helix-local administrative denial-triage policy. This is
// a Helix operating policy — NOT a specific payer's coverage rule. Every finding
// and the drafted appeal cite it so a reviewer can trace the reasoning.
export const REVENUE_POLICY_SOURCE = "policy:helix/revenue-cycle";

// --- Age gates -----------------------------------------------------------
// Recoverability for time-sensitive denials depends on how long the claim has
// aged. Past these windows the administrative recovery path is exhausted and the
// deterministic recommendation flips to write-off. Thresholds are inclusive.
const ELIGIBILITY_RECOVERABLE_MAX_AGE_DAYS = 30;
const LATE_FILING_RECOVERABLE_MAX_AGE_DAYS = 60;

// --- Risk tiers ----------------------------------------------------------
// Risk escalates on either dimension: pesos at stake OR age (older claims are
// harder to recover and signal reimbursement lag). Thresholds are inclusive.
const RISK_HIGH_AMOUNT = 10_000;
const RISK_HIGH_AGE_DAYS = 45;
const RISK_MEDIUM_AMOUNT = 3_000;
const RISK_MEDIUM_AGE_DAYS = 20;

/**
 * The deterministic policy for one denial reason.
 *
 * `recoverableWithinDays` encodes the age gate: `null` means recoverability is
 * fixed (age-independent); a number means the claim is recoverable only while
 * `ageDays <= recoverableWithinDays`, after which the action becomes write_off.
 */
interface DenialPolicy {
  readonly action: RecoveryAction;
  readonly recoverable: boolean;
  readonly fixes: readonly string[];
  readonly recoverableWithinDays: number | null;
}

// Fixed corrective-action lists, one per reason. Named + frozen so the policy is
// single-sourced and auditable; the findings copy them (never share the frozen
// array) to preserve immutability.
const FIXES_ELIGIBILITY_LAPSED: readonly string[] = Object.freeze([
  "confirm active coverage window",
  "re-verify member eligibility",
]);
const FIXES_MISSING_LOA: readonly string[] = Object.freeze([
  "obtain LOA / pre-auth",
  "attach approval reference",
]);
const FIXES_MISSING_DOCUMENT: readonly string[] = Object.freeze([
  "attach referral",
  "attach doctor's request",
]);
const FIXES_SERVICE_NOT_COVERED: readonly string[] = Object.freeze([
  "cite plan benefit schedule",
  "request benefit exception",
]);
const FIXES_CODING_MISMATCH: readonly string[] = Object.freeze([
  "correct service/diagnosis coding",
  "align to payer code set",
]);
const FIXES_LATE_FILING: readonly string[] = Object.freeze([
  "file timeliness appeal with justification",
]);
const FIXES_DUPLICATE_CLAIM: readonly string[] = Object.freeze([
  "void duplicate",
  "confirm single submission",
]);
const FIXES_OTHER: readonly string[] = Object.freeze(["manual review with payer"]);

/**
 * The full denial-reason → policy table. Declared with `satisfies` (not a colon
 * annotation) so it keeps concrete keys — indexing by a validated `DenialReason`
 * yields a `DenialPolicy` directly, with no `| undefined` under
 * `noUncheckedIndexedAccess`. Frozen for immutability.
 */
const DENIAL_POLICY = Object.freeze({
  // Coverage lapsed at service time. Recoverable while the appeal window is open;
  // beyond it the administrative path is exhausted → write-off.
  eligibility_lapsed: {
    action: "contact_payer",
    recoverable: true,
    recoverableWithinDays: ELIGIBILITY_RECOVERABLE_MAX_AGE_DAYS,
    fixes: FIXES_ELIGIBILITY_LAPSED,
  },
  // Missing letter of authorization / pre-auth — obtain it, then resubmit.
  missing_loa: {
    action: "correct_and_resubmit",
    recoverable: true,
    recoverableWithinDays: null,
    fixes: FIXES_MISSING_LOA,
  },
  // Missing supporting document (referral / doctor's request) — attach + resubmit.
  missing_document: {
    action: "correct_and_resubmit",
    recoverable: true,
    recoverableWithinDays: null,
    fixes: FIXES_MISSING_DOCUMENT,
  },
  // Benefit exclusion. Usually not recoverable; the only lever is an appeal that
  // cites the plan's own benefit schedule — never an invented coverage rule.
  service_not_covered: {
    action: "appeal",
    recoverable: false,
    recoverableWithinDays: null,
    fixes: FIXES_SERVICE_NOT_COVERED,
  },
  // Service/diagnosis coding error — correct the codes and resubmit.
  coding_mismatch: {
    action: "correct_and_resubmit",
    recoverable: true,
    recoverableWithinDays: null,
    fixes: FIXES_CODING_MISMATCH,
  },
  // Filed past the deadline. Recoverable via a timeliness appeal within a wider
  // window; beyond it → write-off.
  late_filing: {
    action: "appeal",
    recoverable: true,
    recoverableWithinDays: LATE_FILING_RECOVERABLE_MAX_AGE_DAYS,
    fixes: FIXES_LATE_FILING,
  },
  // Duplicate of an already-submitted claim — not new money; void the duplicate.
  duplicate_claim: {
    action: "resubmit",
    recoverable: false,
    recoverableWithinDays: null,
    fixes: FIXES_DUPLICATE_CLAIM,
  },
  // Unclassified — the catch-all. Route to a human for manual payer review.
  other: {
    action: "contact_payer",
    recoverable: false,
    recoverableWithinDays: null,
    fixes: FIXES_OTHER,
  },
} satisfies Record<DenialReason, DenialPolicy>);

/** Assign a revenue-risk tier from pesos at stake and claim age. Pure. */
export function assessRisk(amount: number, ageDays: number): RevenueRisk {
  if (amount >= RISK_HIGH_AMOUNT || ageDays >= RISK_HIGH_AGE_DAYS) return "high";
  if (amount >= RISK_MEDIUM_AMOUNT || ageDays >= RISK_MEDIUM_AGE_DAYS) {
    return "medium";
  }
  return "low";
}

/**
 * Format pesos deterministically (thousands-separated, 2 decimals) without
 * relying on locale-dependent `toLocaleString`. Shared by the finding rationale,
 * the drafted appeal, and the agent summary so money reads identically everywhere.
 */
export function formatPesos(amount: number): string {
  const [whole, fraction] = amount.toFixed(2).split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}.${fraction ?? "00"}`;
}

/** Compose the short, cited administrative rationale for a single finding. */
function buildFindingRationale(
  denialCase: DenialCase,
  action: RecoveryAction,
  recoverable: boolean,
  risk: RevenueRisk,
): string {
  const recoverText = recoverable
    ? "administratively recoverable"
    : "low recovery likelihood";
  return (
    `Denial '${denialCase.reason}' on ${denialCase.serviceName} ` +
    `(${denialCase.serviceCode}): ${recoverText}; recommend '${action}'. ` +
    `Revenue risk: ${risk} (₱${formatPesos(denialCase.amount)}, aged ` +
    `${denialCase.ageDays}d). Administrative determination per ` +
    `${REVENUE_POLICY_SOURCE}; no payer rule invented.`
  );
}

/**
 * Triage a batch of denied / at-risk claims into per-claim findings. Pure and
 * deterministic — the same input always yields the same findings, in input order.
 *
 * For age-gated reasons (`eligibility_lapsed`, `late_filing`) recoverability is
 * decided by the claim's age against the policy window; once the window closes
 * the recommendation flips to `write_off`. All other reasons use their fixed
 * recoverability. `amountAtRisk` is the claim's full amount.
 */
export function triageDenials(
  cases: readonly DenialCase[],
): RevenueCycleFinding[] {
  return cases.map((denialCase) => {
    const policy = DENIAL_POLICY[denialCase.reason];
    const threshold = policy.recoverableWithinDays;

    // Age gate: within the window it stays recoverable with the policy action;
    // past the window it is a write-off. Fixed reasons ignore age entirely.
    const recoverable =
      threshold !== null ? denialCase.ageDays <= threshold : policy.recoverable;
    const recommendedAction: RecoveryAction =
      threshold !== null && !recoverable ? "write_off" : policy.action;

    const risk = assessRisk(denialCase.amount, denialCase.ageDays);

    return {
      caseId: denialCase.id,
      reason: denialCase.reason,
      recommendedAction,
      recoverable,
      amountAtRisk: denialCase.amount,
      // Copy the frozen policy list so the finding owns a mutable, independent
      // array — callers can never reach back into the shared policy.
      requiredFixes: [...policy.fixes],
      risk,
      rationale: buildFindingRationale(
        denialCase,
        recommendedAction,
        recoverable,
        risk,
      ),
    };
  });
}
