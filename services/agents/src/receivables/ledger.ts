// Receivables ledger engine — the deterministic reasoning core of the
// Receivables Agent (catalog #3). It watches the payer's side of the clock:
// every submitted claim is assessed against the payer's OWN payment obligation
// (PhilHealth: act within 60 days of receipt, IRR of RA 7875 §47, recognized in
// G.R. No. 214485; HMOs: contractual — Helix conservative 30-day default),
// payers are scored on measured behavior, and open money is projected into a
// collections forecast.
//
// It is PURE and deterministic: no I/O, no LLM, no wall clock (each claim's
// "today" is reconstructed from submittedAt + ageDays, the same device as
// denial triage), and it invents NO payer rule — every window cites the PH
// rulebook. An overdue flag is a follow-up trigger, never an automatic
// entitlement (PhilHealth's window excepts claims under investigation).

import type {
  CashflowBucket,
  ClaimRecord,
  DeadlineAssessment,
  PayerId,
  PayerScorecard,
  ReceivableFinding,
  ReceivableStanding,
} from "@helix/shared";
import { assessDeadline, paymentRule, toUtcDay } from "@helix/payers";

// Source label for the Helix-local receivables policy. Findings and the
// follow-up draft cite it so a reviewer can trace every determination.
export const RECEIVABLES_POLICY_SOURCE = "policy:helix/receivables";

const DAY_MS = 24 * 60 * 60 * 1000;

function payerKindOf(payerId: string): "philhealth" | "hmo" {
  return payerId === "philhealth" ? "philhealth" : "hmo";
}

/** ISO yyyy-mm-dd for a UTC-midnight epoch value. */
function isoDate(utcDayMs: number): string {
  return new Date(utcDayMs).toISOString().slice(0, 10);
}

/** A claim's own deterministic "today": submittedAt + ageDays, day precision. */
function claimTodayMs(claim: ClaimRecord): number {
  return toUtcDay(claim.submittedAt) + claim.ageDays * DAY_MS;
}

/**
 * The ledger's deterministic as-of date — the latest claim clock in the batch.
 * Pure; used as the single reference date for the collections forecast.
 */
export function ledgerAsOf(claims: readonly ClaimRecord[]): string {
  const latest = claims.reduce(
    (max, claim) => Math.max(max, claimTodayMs(claim)),
    0,
  );
  return isoDate(latest);
}

/** Pesos still unpaid on one claim (billed − paid; never negative). */
function outstandingOf(claim: ClaimRecord): number {
  if (claim.status === "denied") return 0;
  const paid = claim.amountPaid ?? 0;
  return Math.max(0, claim.amountBilled - paid);
}

/** Standing for an OPEN claim from its payment-window assessment. */
function openStanding(deadline: DeadlineAssessment): ReceivableStanding {
  if (deadline.daysRemaining < 0) return "overdue";
  if (deadline.urgency === "critical" || deadline.urgency === "soon") {
    return "due_soon";
  }
  return "on_track";
}

/** Compose the short, cited administrative rationale for one finding. */
function buildRationale(
  claim: ClaimRecord,
  standing: ReceivableStanding,
  outstanding: number,
  deadline?: DeadlineAssessment,
): string {
  switch (standing) {
    case "settled":
      return (
        `Settled in full by ${claim.payerName}. Nothing outstanding. ` +
        `Per ${RECEIVABLES_POLICY_SOURCE}.`
      );
    case "underpaid":
      return (
        `Settled ₱${claim.amountPaid ?? 0} against ₱${claim.amountBilled} billed — ` +
        `₱${outstanding} shortfall to reconcile with ${claim.payerName}. ` +
        `Per ${RECEIVABLES_POLICY_SOURCE}.`
      );
    case "denied":
      return (
        `Denied by ${claim.payerName} — routed to the Revenue Cycle agent for ` +
        `triage; no longer counted as a receivable. Per ${RECEIVABLES_POLICY_SOURCE}.`
      );
    case "overdue":
      return (
        `Unpaid ${claim.ageDays}d after submission — the payer's own window ` +
        `closed ${deadline?.deadline} per ${deadline?.ruleRef}. Follow up with ` +
        `citation; window excepts claims under formal investigation. ` +
        `Per ${RECEIVABLES_POLICY_SOURCE}.`
      );
    case "due_soon":
      return (
        `Payer window closes ${deadline?.deadline} (${deadline?.daysRemaining}d left) ` +
        `per ${deadline?.ruleRef}. Queue a status check before it lapses. ` +
        `Per ${RECEIVABLES_POLICY_SOURCE}.`
      );
    case "on_track":
      return (
        `Inside the payer's payment window (closes ${deadline?.deadline}, ` +
        `${deadline?.daysRemaining}d remaining) per ${deadline?.ruleRef}. ` +
        `Per ${RECEIVABLES_POLICY_SOURCE}.`
      );
  }
}

/**
 * Assess every claim in the ledger against its payer's payment obligation.
 * Pure and deterministic — same ledger, same findings, in input order.
 */
export function assessReceivables(
  claims: readonly ClaimRecord[],
): ReceivableFinding[] {
  return claims.map((claim) => {
    const outstanding = outstandingOf(claim);

    if (claim.status === "denied") {
      return {
        claimId: claim.id,
        standing: "denied" as const,
        amountOutstanding: 0,
        daysOutstanding: claim.ageDays,
        rationale: buildRationale(claim, "denied", 0),
      };
    }

    if (claim.status === "paid" || claim.status === "paid_partial") {
      const standing = outstanding > 0 ? ("underpaid" as const) : ("settled" as const);
      return {
        claimId: claim.id,
        standing,
        amountOutstanding: outstanding,
        daysOutstanding: claim.ageDays,
        rationale: buildRationale(claim, standing, outstanding),
      };
    }

    // Open claim (submitted / in_review): assess the payer's window with the
    // claim's own reconstructed "today" — no wall clock.
    const rule = paymentRule(payerKindOf(claim.payerId));
    const todayIso = new Date(claimTodayMs(claim)).toISOString();
    const deadline = assessDeadline(rule, claim.submittedAt, todayIso);
    const standing = openStanding(deadline);

    return {
      claimId: claim.id,
      standing,
      amountOutstanding: outstanding,
      daysOutstanding: claim.ageDays,
      deadline,
      rationale: buildRationale(claim, standing, outstanding, deadline),
    };
  });
}

// --- Payer scorecards -------------------------------------------------------

/** Median of a non-empty numeric list (interpolated on even counts). */
function medianOf(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

// Grade thresholds. The composite weighs punctuality over completeness of
// payment; carrying ANY overdue money caps a payer below A regardless of a
// clean paid history — the card must never read "excellent" while the clinic
// is owed past-due pesos.
const GRADE_A_SCORE = 0.85;
const GRADE_B_SCORE = 0.65;
const GRADE_C_SCORE = 0.4;
const ON_TIME_WEIGHT = 0.7;
const SHORTFALL_WEIGHT = 0.3;

function gradeOf(
  onTimeRate: number | undefined,
  shortfallRate: number | undefined,
  overdueCount: number,
): PayerScorecard["grade"] {
  const punctuality = onTimeRate ?? 1; // no history yet → benefit of the doubt
  const completeness = 1 - (shortfallRate ?? 0);
  // Round to 3 decimals before comparing: 0.7·0.5 + 0.3·1 is 0.6499999… in
  // binary float and would misgrade a payer sitting exactly on a boundary.
  const score =
    Math.round((ON_TIME_WEIGHT * punctuality + SHORTFALL_WEIGHT * completeness) * 1000) /
    1000;

  let grade: PayerScorecard["grade"];
  if (score >= GRADE_A_SCORE) grade = "A";
  else if (score >= GRADE_B_SCORE) grade = "B";
  else if (score >= GRADE_C_SCORE) grade = "C";
  else grade = "D";

  if (overdueCount > 0 && grade === "A") grade = "B";
  return grade;
}

/**
 * Measure how each payer actually behaves, from the ledger itself. Pure.
 * Cards come back in first-seen payer order; every rate is measured, never
 * assumed — a payer with no decided claims has `undefined` rates, not fake ones.
 */
export function buildScorecards(
  claims: readonly ClaimRecord[],
  findings: readonly ReceivableFinding[],
): PayerScorecard[] {
  const findingById = new Map(findings.map((finding) => [finding.claimId, finding]));
  const order: PayerId[] = [];
  const grouped = new Map<PayerId, ClaimRecord[]>();
  for (const claim of claims) {
    const bucket = grouped.get(claim.payerId);
    if (bucket) {
      bucket.push(claim);
    } else {
      grouped.set(claim.payerId, [claim]);
      order.push(claim.payerId);
    }
  }

  return order.map((payerId) => {
    const rows = grouped.get(payerId)!;
    const decided = rows.filter((row) => row.decidedAt !== undefined);
    const settled = rows.filter(
      (row) => row.status === "paid" || row.status === "paid_partial",
    );

    const totalBilled = rows.reduce((sum, row) => sum + row.amountBilled, 0);
    const totalPaid = rows.reduce((sum, row) => sum + (row.amountPaid ?? 0), 0);

    let totalOutstanding = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    for (const row of rows) {
      const finding = findingById.get(row.id);
      if (!finding) continue;
      totalOutstanding += finding.amountOutstanding;
      if (finding.standing === "overdue") {
        overdueCount += 1;
        overdueAmount += finding.amountOutstanding;
      }
    }

    // Days from submission to decision, for settled claims (denials excluded —
    // a fast denial is not "paying fast").
    const daysToPay = settled
      .filter((row) => row.decidedAt !== undefined)
      .map((row) =>
        Math.round((toUtcDay(row.decidedAt!) - toUtcDay(row.submittedAt)) / DAY_MS),
      );

    const rule = paymentRule(payerKindOf(payerId));
    const onTimeCount = daysToPay.filter((days) => days <= rule.days).length;
    const shortfallCount = settled.filter(
      (row) => (row.amountPaid ?? 0) < row.amountBilled,
    ).length;
    const deniedCount = decided.filter((row) => row.status === "denied").length;

    const medianDaysToPay = daysToPay.length > 0 ? medianOf(daysToPay) : undefined;
    const onTimeRate =
      daysToPay.length > 0 ? onTimeCount / daysToPay.length : undefined;
    const shortfallRate =
      settled.length > 0 ? shortfallCount / settled.length : undefined;
    const denialRate =
      decided.length > 0 ? deniedCount / decided.length : undefined;

    return {
      payerId,
      payerName: rows[0]!.payerName,
      claimCount: rows.length,
      totalBilled,
      totalPaid,
      totalOutstanding,
      overdueCount,
      overdueAmount,
      ...(medianDaysToPay !== undefined ? { medianDaysToPay } : {}),
      ...(onTimeRate !== undefined ? { onTimeRate } : {}),
      ...(shortfallRate !== undefined ? { shortfallRate } : {}),
      ...(denialRate !== undefined ? { denialRate } : {}),
      grade: gradeOf(onTimeRate, shortfallRate, overdueCount),
    };
  });
}

// --- Collections forecast ---------------------------------------------------

// Fixed forecast horizon. Four stable buckets so the surface renders the same
// shape whether the ledger is empty or full.
interface BucketSpec {
  label: string;
  fromDay: number;
  /** Inclusive upper bound in days; undefined = open-ended tail. */
  toDay?: number;
}

const FORECAST_BUCKETS: readonly BucketSpec[] = Object.freeze([
  { label: "0–7d", fromDay: 0, toDay: 7 },
  { label: "8–14d", fromDay: 8, toDay: 14 },
  { label: "15–30d", fromDay: 15, toDay: 30 },
  { label: "31d+", fromDay: 31 },
]);

/**
 * Project every OPEN claim into a expected-collections bucket. The expected
 * settlement date = submittedAt + the payer's OBSERVED median days-to-pay,
 * falling back to the cited rulebook window when the ledger holds no history
 * for that payer. Money already past its expected date lands in the first
 * bucket — it is chase-now money, not future money. Pure and deterministic
 * (reference date = ledgerAsOf, never the wall clock).
 */
export function forecastCashflow(
  claims: readonly ClaimRecord[],
  scorecards: readonly PayerScorecard[],
): CashflowBucket[] {
  const asOfIso = ledgerAsOf(claims);
  const asOfMs = claims.length > 0 ? toUtcDay(asOfIso) : 0;
  const medianByPayer = new Map(
    scorecards.map((card) => [card.payerId, card.medianDaysToPay]),
  );

  const totals = FORECAST_BUCKETS.map(() => ({ amount: 0, count: 0 }));

  for (const claim of claims) {
    if (claim.status !== "submitted" && claim.status !== "in_review") continue;
    const observed = medianByPayer.get(claim.payerId);
    const expectedInDays =
      observed ?? paymentRule(payerKindOf(claim.payerId)).days;
    const expectedMs = toUtcDay(claim.submittedAt) + expectedInDays * DAY_MS;
    const daysOut = Math.max(0, Math.round((expectedMs - asOfMs) / DAY_MS));

    const index = FORECAST_BUCKETS.findIndex(
      (bucket) => bucket.toDay === undefined || daysOut <= bucket.toDay,
    );
    const slot = totals[index === -1 ? totals.length - 1 : index]!;
    slot.amount += claim.amountBilled;
    slot.count += 1;
  }

  return FORECAST_BUCKETS.map((bucket, index) => ({
    from: isoDate(asOfMs + bucket.fromDay * DAY_MS),
    ...(bucket.toDay !== undefined
      ? { to: isoDate(asOfMs + bucket.toDay * DAY_MS) }
      : {}),
    label: bucket.label,
    expectedAmount: totals[index]!.amount,
    claimCount: totals[index]!.count,
  }));
}
