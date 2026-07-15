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
  DeadlineAssessment,
  DenialCase,
  DenialReason,
  PayerKind,
  RecoveryAction,
  RevenueRisk,
  RevenueCycleFinding,
} from "@helix/shared";
import {
  appealRule,
  assessDeadline,
  refileRule,
  toUtcDay,
  type RegulatoryRule,
} from "@helix/payers";

// Source label for the Helix-local administrative denial-triage policy. This is
// a Helix operating policy — NOT a specific payer's coverage rule. Every finding
// and the drafted appeal cite it so a reviewer can trace the reasoning.
export const REVENUE_POLICY_SOURCE = "policy:helix/revenue-cycle";

// --- Recovery windows ------------------------------------------------------
// Recoverability for time-sensitive denials is governed by the payer's actual
// window from the PH rulebook (@helix/payers knowledge):
//   - PhilHealth: motion for reconsideration within 15 calendar days of the
//     denial notice (PC 03 s.2008, verified); returned/RTH claims re-filed
//     within 60 days of the notice (PC 2018-0014 §V.F, verified).
//   - PH HMOs: reconsideration windows are CONTRACTUAL — Helix operating
//     default 30 days, confirm per contract before live use. No published
//     HMO refile window → HMO document/coding fixes stay clock-independent.
// Once the governing window closes the administrative recovery path is
// exhausted and the recommendation flips to write-off. Thresholds inclusive.

const DAY_MS = 24 * 60 * 60 * 1000;

function payerKindOf(payerId: string): PayerKind {
  return payerId === "philhealth" ? "philhealth" : "hmo";
}

/** The rulebook window governing one (payer, reason) pair, if any. */
interface GoverningWindow {
  readonly rule: RegulatoryRule;
  /** True → recoverability is gated by the window; false → guidance only. */
  readonly gates: boolean;
}

function governingWindow(
  payerKind: PayerKind,
  reason: DenialReason,
): GoverningWindow | undefined {
  switch (reason) {
    // The reconsideration window decides whether the money is still reachable.
    case "eligibility_lapsed":
    case "late_filing":
      return { rule: appealRule(payerKind), gates: true };
    // Correctable deficiencies ride the payer's refile window where one is
    // published (PhilHealth RTH 60d); HMOs have none → clock-independent.
    case "missing_document":
    case "coding_mismatch": {
      const rule = refileRule(payerKind);
      return rule ? { rule, gates: true } : undefined;
    }
    // Benefit exclusions aren't recoverable, but the appeal-by date is the
    // only lever a reviewer has — attach it as guidance.
    case "service_not_covered":
      return { rule: appealRule(payerKind), gates: false };
    default:
      return undefined;
  }
}

/**
 * Assess the governing recovery window for one denial. Deterministic with no
 * wall clock: "today" is reconstructed from the claim's own
 * `deniedAt + ageDays`, so the same case always yields the same assessment.
 * Returns undefined for clock-independent (payer, reason) pairs.
 */
export function recoveryDeadlineFor(
  denialCase: DenialCase,
): DeadlineAssessment | undefined {
  const window = governingWindow(
    payerKindOf(denialCase.payerId),
    denialCase.reason,
  );
  if (!window) return undefined;
  const todayIso = new Date(
    toUtcDay(denialCase.deniedAt) + denialCase.ageDays * DAY_MS,
  ).toISOString();
  return assessDeadline(window.rule, denialCase.deniedAt, todayIso);
}

// --- Risk tiers ----------------------------------------------------------
// Risk escalates on either dimension: pesos at stake OR age (older claims are
// harder to recover and signal reimbursement lag). Thresholds are inclusive.
const RISK_HIGH_AMOUNT = 10_000;
const RISK_HIGH_AGE_DAYS = 45;
const RISK_MEDIUM_AMOUNT = 3_000;
const RISK_MEDIUM_AGE_DAYS = 20;

/**
 * The deterministic policy for one denial reason. Reasons listed in
 * `DEADLINE_GOVERNED` are recoverable only while the payer's reconsideration
 * window (PH rulebook, payer-kind aware) is still open — past it the action
 * becomes write_off. All other reasons keep their fixed recoverability.
 */
interface DenialPolicy {
  readonly action: RecoveryAction;
  readonly recoverable: boolean;
  readonly fixes: readonly string[];
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
  // Coverage lapsed at service time. Recoverable while the payer's
  // reconsideration window is open; beyond it → write-off (deadline-governed).
  eligibility_lapsed: {
    action: "contact_payer",
    recoverable: true,
    fixes: FIXES_ELIGIBILITY_LAPSED,
  },
  // Missing letter of authorization / pre-auth — obtain it, then resubmit.
  missing_loa: {
    action: "correct_and_resubmit",
    recoverable: true,
    fixes: FIXES_MISSING_LOA,
  },
  // Missing supporting document (referral / doctor's request) — attach + resubmit.
  missing_document: {
    action: "correct_and_resubmit",
    recoverable: true,
    fixes: FIXES_MISSING_DOCUMENT,
  },
  // Benefit exclusion. Usually not recoverable; the only lever is an appeal that
  // cites the plan's own benefit schedule — never an invented coverage rule.
  service_not_covered: {
    action: "appeal",
    recoverable: false,
    fixes: FIXES_SERVICE_NOT_COVERED,
  },
  // Service/diagnosis coding error — correct the codes and resubmit.
  coding_mismatch: {
    action: "correct_and_resubmit",
    recoverable: true,
    fixes: FIXES_CODING_MISMATCH,
  },
  // Filed past the deadline. Recoverable via a timeliness appeal while the
  // payer's reconsideration window is open; beyond it → write-off.
  late_filing: {
    action: "appeal",
    recoverable: true,
    fixes: FIXES_LATE_FILING,
  },
  // Duplicate of an already-submitted claim — not new money; void the duplicate.
  duplicate_claim: {
    action: "resubmit",
    recoverable: false,
    fixes: FIXES_DUPLICATE_CLAIM,
  },
  // Unclassified — the catch-all. Route to a human for manual payer review.
  other: {
    action: "contact_payer",
    recoverable: false,
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
  deadline?: DeadlineAssessment,
): string {
  const recoverText = recoverable
    ? "administratively recoverable"
    : "low recovery likelihood";
  const deadlineText = deadline
    ? deadline.daysRemaining >= 0
      ? ` Recovery window closes ${deadline.deadline} ` +
        `(${deadline.daysRemaining}d left) per ${deadline.ruleRef}.`
      : ` Recovery window closed ${deadline.deadline} per ${deadline.ruleRef}.`
    : "";
  return (
    `Denial '${denialCase.reason}' on ${denialCase.serviceName} ` +
    `(${denialCase.serviceCode}): ${recoverText}; recommend '${action}'. ` +
    `Revenue risk: ${risk} (₱${formatPesos(denialCase.amount)}, aged ` +
    `${denialCase.ageDays}d).${deadlineText} Administrative determination per ` +
    `${REVENUE_POLICY_SOURCE}; no payer rule invented.`
  );
}

/**
 * Triage a batch of denied / at-risk claims into per-claim findings. Pure and
 * deterministic — the same input always yields the same findings, in input order.
 *
 * Recoverability for deadline-governed (payer, reason) pairs is decided by the
 * PH rulebook window (PhilHealth: 15d motion for reconsideration, 60d RTH
 * refile; HMO: 30d contractual default for reconsideration): once the window
 * closes the recommendation flips to `write_off`. All other reasons keep their
 * fixed recoverability. `amountAtRisk` is the claim's full amount.
 */
export function triageDenials(
  cases: readonly DenialCase[],
): RevenueCycleFinding[] {
  return cases.map((denialCase) => {
    const policy = DENIAL_POLICY[denialCase.reason];
    const window = governingWindow(
      payerKindOf(denialCase.payerId),
      denialCase.reason,
    );
    const deadline = window ? recoveryDeadlineFor(denialCase) : undefined;
    const governed = window?.gates === true;

    // Deadline gate: within the payer window it stays recoverable with the
    // policy action; past the window it is a write-off. Fixed reasons ignore
    // the clock entirely.
    const windowOpen = deadline === undefined || deadline.daysRemaining >= 0;
    const recoverable = governed ? policy.recoverable && windowOpen : policy.recoverable;
    const recommendedAction: RecoveryAction =
      governed && !windowOpen ? "write_off" : policy.action;

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
        deadline,
      ),
      ...(deadline !== undefined ? { deadline } : {}),
    };
  });
}
