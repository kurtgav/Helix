// Policy intelligence engine — the deterministic reasoning core over a
// member's PolicyProfile. Given the retrieved policy facts (coverage window,
// policy type, waiting period, PEC terms, benefit limits) and the service
// date, it emits cited PolicyChecks:
//
//   pass      — administratively clear from cited policy data,
//   fail      — administratively certain blocker (window lapsed, waiting
//               period active, benefit exhausted),
//   attention — a policy rule EXISTS that a human must apply (e.g. an
//               individual plan's pre-existing-condition exclusion — Helix
//               flags the rule; it NEVER judges whether a condition is
//               pre-existing, because that would be clinical),
//   unknown   — the data to decide is missing.
//
// PURE and deterministic: no I/O, no LLM, no clinical judgment, no invented
// payer rules — every check cites the retrieved profile or the PH rulebook.

import type {
  EligibilityStatus,
  Evidence,
  Gap,
  PayerKind,
  PolicyCheck,
  PolicyProfile,
} from "@helix/shared";
import {
  assessDeadline,
  claimFilingRule,
  daysBetween,
  pecStandardsEvidence,
  ruleEvidence,
  toUtcDay,
} from "@helix/payers";

// Attention threshold: flag the benefit limit once this share is consumed.
const BENEFIT_ATTENTION_RATIO = 0.8;

/** Pesos formatted deterministically for check details (no locale surprises). */
function pesos(amount: number): string {
  const [whole, fraction] = amount.toFixed(2).split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₱${grouped}.${fraction ?? "00"}`;
}

/** ISO yyyy-mm-dd after adding calendar months (UTC; JS rolls overflow). */
function addMonthsIso(iso: string, months: number): string {
  const base = new Date(toUtcDay(iso));
  const shifted = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, base.getUTCDate()),
  );
  return shifted.toISOString().slice(0, 10);
}

/** ISO yyyy-mm-dd after adding calendar days (UTC). */
function addDaysIso(iso: string, days: number): string {
  return new Date(toUtcDay(iso) + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export interface PolicyEngineInput {
  /** Retrieved policy facts; null when the payer does not know the member. */
  profile: PolicyProfile | null;
  payerKind: PayerKind;
  /** ISO date the service is being availed (the verification "today"). */
  serviceDate: string;
}

/**
 * Run every policy check the retrieved profile supports. Checks whose data is
 * absent are skipped (never guessed). Pure and deterministic.
 */
export function evaluatePolicyChecks(input: PolicyEngineInput): PolicyCheck[] {
  const { profile, payerKind, serviceDate } = input;
  const checks: PolicyCheck[] = [];

  if (!profile) {
    return [
      {
        kind: "coverage_window",
        status: "unknown",
        label: "Policy profile",
        detail:
          "Member not found in the payer directory — policy terms could not be retrieved. A human must verify the membership.",
        evidence: [],
      },
    ];
  }

  const policyEvidence: Evidence[] = profile.evidence;

  // 1) Coverage window — the service date must fall inside the policy term.
  if (profile.validFrom || profile.validTo) {
    const from = profile.validFrom;
    const to = profile.validTo;
    const beforeStart = from ? daysBetween(from, serviceDate) < 0 : false;
    const afterEnd = to ? daysBetween(serviceDate, to) < 0 : false;
    const window = `${from ?? "…"} → ${to ?? "open"}`;
    checks.push({
      kind: "coverage_window",
      status: beforeStart || afterEnd ? "fail" : "pass",
      label: "Coverage window",
      detail:
        beforeStart || afterEnd
          ? `Service date ${serviceDate} falls outside the policy term (${window}).`
          : `Service date ${serviceDate} is inside the policy term (${window}).`,
      evidence: policyEvidence,
    });
  }

  // 2) Waiting period — individual plans commonly gate non-emergency
  //    availment for the first N days after the policy takes effect.
  if (
    profile.effectiveDate &&
    profile.waitingPeriodDays !== undefined &&
    profile.waitingPeriodDays > 0
  ) {
    const served = daysBetween(profile.effectiveDate, serviceDate);
    const liftDate = addDaysIso(profile.effectiveDate, profile.waitingPeriodDays);
    const active = served < profile.waitingPeriodDays;
    checks.push({
      kind: "waiting_period",
      status: active ? "fail" : "pass",
      label: "Waiting period",
      detail: active
        ? `The plan's ${profile.waitingPeriodDays}-day waiting period is still active (day ${served} of ${profile.waitingPeriodDays}); non-emergency availment opens ${liftDate}.`
        : `The ${profile.waitingPeriodDays}-day waiting period was served (effective ${profile.effectiveDate}).`,
      evidence: policyEvidence,
    });
  }

  // 3) Pre-existing conditions — Helix flags the RULE, never the condition.
  if (profile.pecCovered === true) {
    checks.push({
      kind: "pre_existing",
      status: "pass",
      label: "Pre-existing conditions",
      detail:
        profile.policyType === "corporate_group"
          ? "Pre-existing conditions are covered under the group policy terms."
          : "Pre-existing conditions are covered under the policy terms.",
      evidence: policyEvidence,
    });
  } else if (
    profile.pecExclusionMonths !== undefined &&
    profile.pecExclusionMonths > 0 &&
    profile.effectiveDate
  ) {
    const exclusionEnds = addMonthsIso(
      profile.effectiveDate,
      profile.pecExclusionMonths,
    );
    const insideExclusion = daysBetween(serviceDate, exclusionEnds) > 0;
    checks.push({
      kind: "pre_existing",
      status: insideExclusion ? "attention" : "pass",
      label: "Pre-existing conditions",
      detail: insideExclusion
        ? `This individual policy excludes pre-existing conditions until ${exclusionEnds} (${profile.pecExclusionMonths}-month exclusion; the IC caps PEC waiting periods at 1 year). A human must confirm the requested service is unrelated to a pre-existing condition — Helix does not make that judgment.`
        : `The ${profile.pecExclusionMonths}-month pre-existing-condition exclusion lapsed on ${exclusionEnds}.`,
      // Cite the plan's own terms plus the IC ceiling that bounds them.
      evidence: [...policyEvidence, pecStandardsEvidence()],
    });
  }

  // 4) Benefit limit — exhausted MBL is an administrative dead end.
  if (profile.mblPhp !== undefined && profile.usedBenefitPhp !== undefined) {
    const remaining = profile.mblPhp - profile.usedBenefitPhp;
    const ratio = profile.usedBenefitPhp / profile.mblPhp;
    const status =
      remaining <= 0 ? "fail" : ratio >= BENEFIT_ATTENTION_RATIO ? "attention" : "pass";
    checks.push({
      kind: "benefit_limit",
      status,
      label: "Benefit limit",
      detail:
        remaining <= 0
          ? `The maximum benefit limit of ${pesos(profile.mblPhp)} is exhausted — further availment is not covered under this policy year.`
          : status === "attention"
            ? `${pesos(remaining)} remains of the ${pesos(profile.mblPhp)} maximum benefit limit (${Math.round(ratio * 100)}% consumed) — high-cost services may exceed it.`
            : `${pesos(remaining)} remains of the ${pesos(profile.mblPhp)} maximum benefit limit.`,
      evidence: policyEvidence,
    });
  }

  // 5) Claim-filing window — forward-looking: when the claim for THIS service
  //    must reach the payer. Informational (pass), cited to the PH rulebook.
  const filingRule = claimFilingRule(payerKind);
  const filing = assessDeadline(filingRule, serviceDate, serviceDate);
  checks.push({
    kind: "filing_window",
    status: "pass",
    label: "Claim filing window",
    detail: `File the claim within ${filingRule.days} calendar days of service — by ${filing.deadline} (${filingRule.authority}).`,
    evidence: [ruleEvidence(filingRule)],
  });

  return checks;
}

/**
 * Blocking/non-blocking gaps derived from policy checks: `fail` blocks the
 * encounter; `attention`/`unknown` become review notes. Pure.
 */
export function policyGaps(checks: readonly PolicyCheck[]): Gap[] {
  return checks
    .filter((check) => check.status !== "pass")
    .map((check) => ({
      kind: "coverage" as const,
      message: check.detail,
      blocking: check.status === "fail",
    }));
}

// Severity ladder for the one-way escalation below.
const STATUS_SEVERITY: Record<EligibilityStatus, number> = {
  eligible: 0,
  needs_review: 1,
  ineligible: 2,
};

/**
 * Escalate the adapter's status by the policy findings — one way only (never
 * downgrades): any `fail` ⇒ ineligible; any `attention`/`unknown` ⇒ at least
 * needs_review; all `pass` leaves the status untouched. Pure.
 */
export function escalateStatus(
  adapterStatus: EligibilityStatus,
  checks: readonly PolicyCheck[],
): EligibilityStatus {
  const hasFail = checks.some((check) => check.status === "fail");
  const hasReview = checks.some(
    (check) => check.status === "attention" || check.status === "unknown",
  );
  const derived: EligibilityStatus = hasFail
    ? "ineligible"
    : hasReview
      ? "needs_review"
      : "eligible";

  return STATUS_SEVERITY[derived] > STATUS_SEVERITY[adapterStatus]
    ? derived
    : adapterStatus;
}
