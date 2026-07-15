// PH payer rulebook — the cited knowledge layer behind Helix's policy
// intelligence. Every time-window rule this module exposes carries:
//   - the issuing authority + document reference (citable Evidence),
//   - a confidence grade (verified from primary source / reported by
//     secondary sources / Helix operating assumption),
//   - a `verifyBeforeLive` flag: assumed/reported rules MUST be confirmed
//     against current payer documents before any live payer automation
//     (same guardrail as the mock-only adapter registry).
//
// The calculators are PURE date math over these rules — deterministic given
// `today`, no I/O, no LLM, no clinical judgment. See
// brain/strategy/ph-denial-and-eligibility-rules.md for the research trail.

import type { DeadlineAssessment, DeadlineKind, Evidence, PayerKind } from "@helix/shared";

export type RuleConfidence = "verified" | "reported" | "assumed";

export interface RegulatoryRule {
  /** Stable id, e.g. "philhealth-claim-filing". */
  id: string;
  /** Issuing authority: "PhilHealth", "Insurance Commission", or "Helix". */
  authority: string;
  title: string;
  /** Document reference, e.g. "PhilHealth Circular No. 2018-0014". */
  ref: string;
  url?: string;
  /** The window length in calendar days. */
  days: number;
  appliesTo: PayerKind;
  kind: DeadlineKind;
  confidence: RuleConfidence;
  /** True → must be confirmed against current payer docs before live use. */
  verifyBeforeLive: boolean;
  summary: string;
}

// --- The rule table -------------------------------------------------------
// PhilHealth windows come from public PhilHealth issuances (see brain note for
// the full research trail). HMO windows are CONTRACTUAL — set per provider
// agreement, not by statute — so Helix ships conservative operating
// assumptions that must be replaced with each clinic's actual contract terms
// before live automation.

/** PhilHealth: claims must be filed within 60 calendar days from discharge. */
export const PHILHEALTH_CLAIM_FILING: RegulatoryRule = Object.freeze({
  id: "philhealth-claim-filing",
  authority: "PhilHealth",
  title: "Claim filing period (statutory)",
  ref: "RA 7875 §35 (as amended by RA 10606 §25); 2013 Revised IRR §46",
  url: "https://www.philhealth.gov.ph/about_us/ra10606.pdf",
  days: 60,
  appliesTo: "philhealth" as PayerKind,
  kind: "claim_filing" as DeadlineKind,
  confidence: "verified" as RuleConfidence,
  verifyBeforeLive: false,
  summary:
    "All claims must be filed within 60 calendar days from the date of discharge (extendable by PhilHealth for reasonable causes, e.g. 120 days under fortuitous-event privileges per PC 2020-0007).",
});

/** PhilHealth: denied/reduced claims — motion for reconsideration window. */
export const PHILHEALTH_APPEAL: RegulatoryRule = Object.freeze({
  id: "philhealth-appeal",
  authority: "PhilHealth",
  title: "Motion for reconsideration on denied or reduced claims",
  ref: "PhilHealth Circular No. 03, s. 2008",
  url: "https://www.philhealth.gov.ph/circulars/2008/circ3_2008.pdf",
  days: 15,
  appliesTo: "philhealth" as PayerKind,
  kind: "appeal" as DeadlineKind,
  confidence: "verified" as RuleConfidence,
  verifyBeforeLive: false,
  summary:
    "A denied or reduced claim may be contested via motion for reconsideration filed with the PhilHealth Regional Office within 15 calendar days from receipt of the denial notice; a final appeal to PARD has a further 15 calendar days from receipt of the MR denial.",
});

/** PhilHealth: returned (RTH) claims — correction and refiling window. */
export const PHILHEALTH_RTH_REFILE: RegulatoryRule = Object.freeze({
  id: "philhealth-rth-refile",
  authority: "PhilHealth",
  title: "Return-to-hospital (RTH) claim refiling window",
  ref: "PhilHealth Circular No. 2018-0014 §V.F",
  url: "https://www.philhealth.gov.ph/circulars/2018/circ2018-0014.pdf",
  days: 60,
  appliesTo: "philhealth" as PayerKind,
  kind: "refile" as DeadlineKind,
  confidence: "verified" as RuleConfidence,
  verifyBeforeLive: false,
  summary:
    "A claim returned to the health-care institution for correction or completion must be re-filed within 60 days from receipt of the RTH notice; otherwise it is denied.",
});

/** HMO: claim-filing window — contractual; Helix conservative default. */
export const HMO_CLAIM_FILING: RegulatoryRule = Object.freeze({
  id: "hmo-claim-filing",
  authority: "Helix",
  title: "HMO claim filing window (operating default)",
  ref: "policy:helix/ph-rulebook",
  days: 30,
  appliesTo: "hmo" as PayerKind,
  kind: "claim_filing" as DeadlineKind,
  confidence: "reported" as RuleConfidence,
  verifyBeforeLive: true,
  summary:
    "PH HMO filing windows are contractual. Official member-reimbursement windows: Maxicare, MediCard, Intellicare and Avega 30 days from availment/discharge; InLife iCare 60 days. Provider-side windows live in unpublished accreditation agreements — confirm per contract; Helix defaults to the conservative 30 days.",
});

/** HMO: reconsideration/appeal window after a denial — payer-set default. */
export const HMO_APPEAL: RegulatoryRule = Object.freeze({
  id: "hmo-appeal",
  authority: "Helix",
  title: "HMO denial reconsideration window (operating default)",
  ref: "policy:helix/ph-rulebook",
  days: 30,
  appliesTo: "hmo" as PayerKind,
  kind: "appeal" as DeadlineKind,
  confidence: "assumed" as RuleConfidence,
  verifyBeforeLive: true,
  summary:
    "No IC circular fixes an HMO reconsideration window — it is payer-set (documented example: MediCard accepts a written appeal within 10 working days of the denial). Helix's 30-day ceiling MUST be confirmed per HMO. Escalation: Insurance Commission complaint (CAR to PAMD; IMC 2023-01 CAMS requires HMO resolution in 7–45 working days).",
});

/** HMO: LOA validity — payer-specific; conservative Helix default. */
export const HMO_LOA_VALIDITY: RegulatoryRule = Object.freeze({
  id: "hmo-loa-validity",
  authority: "Helix",
  title: "LOA validity window (operating default)",
  ref: "policy:helix/ph-rulebook",
  days: 3,
  appliesTo: "hmo" as PayerKind,
  kind: "loa_validity" as DeadlineKind,
  confidence: "reported" as RuleConfidence,
  verifyBeforeLive: true,
  summary:
    "LOA validity is payer-specific, not an IC rule: Maxicare 30 days from issuance (official); PhilCare 3 calendar days (official); MediCard/Intellicare unpublished (secondary sources: 3 days). Helix defaults to the conservative 3 days; the per-payer value always overrides.",
});

/**
 * PhilHealth: the payer's OWN payment clock — claims must be acted upon
 * (processed, reviewed, paid) within 60 calendar days of receipt. This is the
 * receivables mirror of the filing rule: the clinic owes PhilHealth a claim in
 * 60 days; PhilHealth owes the clinic an action in 60 days.
 */
export const PHILHEALTH_CLAIM_PAYMENT: RegulatoryRule = Object.freeze({
  id: "philhealth-claim-payment",
  authority: "PhilHealth",
  title: "Claim processing/payment period (the payer's obligation)",
  ref: "IRR of RA 7875 (as amended, 2013) §47; recognized in PHIC v. Urdaneta Sacred Heart Hospital, G.R. No. 214485 (Jan 11, 2021)",
  url: "https://www.philhealth.gov.ph/about_us/IRR_NHIAct_2013.pdf",
  days: 60,
  appliesTo: "philhealth" as PayerKind,
  kind: "payer_payment" as DeadlineKind,
  confidence: "verified" as RuleConfidence,
  verifyBeforeLive: false,
  summary:
    "All claims, except those under investigation, shall be acted upon within 60 calendar days from receipt by the Corporation. The Supreme Court recognized this processing mandate in PHIC v. Urdaneta Sacred Heart Hospital (G.R. No. 214485). Claims under formal investigation are excepted — an overdue flag is a follow-up trigger, never an automatic entitlement.",
});

/** HMO: provider payment timeline — contractual; Helix conservative default. */
export const HMO_CLAIM_PAYMENT: RegulatoryRule = Object.freeze({
  id: "hmo-claim-payment",
  authority: "Helix",
  title: "HMO provider payment window (operating default)",
  ref: "policy:helix/ph-rulebook (AHMOPI-template provider terms: 45–60 days)",
  days: 45,
  appliesTo: "hmo" as PayerKind,
  kind: "payer_payment" as DeadlineKind,
  confidence: "reported" as RuleConfidence,
  verifyBeforeLive: true,
  summary:
    "No statute fixes when a PH HMO must pay an accredited provider — the timeline lives in each accreditation agreement. AHMOPI-template provider terms make physician outpatient claims payable in 45–60 days; Helix defaults to the earlier bound (45 calendar days from complete submission) and the clinic's actual contract always overrides. Escalation path: written demand, then an Insurance Commission complaint — IC CL 2024-01 lists failing to affirm or deny claims within a reasonable time as an unfair claims settlement practice; CAMS (IMC 2023-01) expects HMO resolution in 7–45 working days.",
});

// --- Non-window regulatory references ---------------------------------------

/**
 * IC standards bounding pre-existing-condition exclusions. Not a deadline —
 * cited by the policy engine's PEC check so reviewers see the regulatory
 * ceiling next to the plan's own terms.
 */
export const IC_PEC_STANDARDS = Object.freeze({
  id: "ic-pec-standards",
  authority: "Insurance Commission",
  title: "Standards on pre-existing-condition provisions",
  ref: "IC Circular Letter No. 2018-65 (extended to HMOs via CL 2018-66)",
  url: "https://www.insurance.gov.ph/wp-content/uploads/2023/03/CL2018_65.pdf",
  confidence: "verified" as RuleConfidence,
  verifyBeforeLive: false,
  summary:
    "PEC exclusions are bounded: the waiting period must not exceed 1 year from effectivity, the look-back period is capped at 2 years, and after 1 year of continuous coverage the PEC exclusion is lifted for diseases the plan covers.",
});

/** Evidence citation for the IC PEC standards. */
export function pecStandardsEvidence(): Evidence {
  return {
    source: `reg:insurance-commission/${IC_PEC_STANDARDS.id}`,
    ref: IC_PEC_STANDARDS.ref,
    snippet: IC_PEC_STANDARDS.summary,
  };
}

const ALL_RULES: readonly RegulatoryRule[] = Object.freeze([
  PHILHEALTH_CLAIM_FILING,
  PHILHEALTH_APPEAL,
  PHILHEALTH_RTH_REFILE,
  PHILHEALTH_CLAIM_PAYMENT,
  HMO_CLAIM_FILING,
  HMO_APPEAL,
  HMO_LOA_VALIDITY,
  HMO_CLAIM_PAYMENT,
]);

/** Every rule in the PH rulebook (frozen; copy before mutating). */
export function listRules(): readonly RegulatoryRule[] {
  return ALL_RULES;
}

/** The claim-filing rule for a payer kind. */
export function claimFilingRule(payerKind: PayerKind): RegulatoryRule {
  return payerKind === "philhealth" ? PHILHEALTH_CLAIM_FILING : HMO_CLAIM_FILING;
}

/** The denial-appeal / reconsideration rule for a payer kind. */
export function appealRule(payerKind: PayerKind): RegulatoryRule {
  return payerKind === "philhealth" ? PHILHEALTH_APPEAL : HMO_APPEAL;
}

/**
 * The correction/refile window for a returned claim. PhilHealth's RTH window
 * is verified (60 days from notice); HMOs have no equivalent published rule,
 * so `undefined` — HMO document/coding fixes stay clock-independent.
 */
export function refileRule(payerKind: PayerKind): RegulatoryRule | undefined {
  return payerKind === "philhealth" ? PHILHEALTH_RTH_REFILE : undefined;
}

/**
 * The payer's OWN payment/processing obligation for a submitted claim — the
 * clock the Receivables agent watches. PhilHealth's is verified regulation;
 * the HMO default is contractual and must be replaced per agreement.
 */
export function paymentRule(payerKind: PayerKind): RegulatoryRule {
  return payerKind === "philhealth" ? PHILHEALTH_CLAIM_PAYMENT : HMO_CLAIM_PAYMENT;
}

/** Stable Evidence citation for a rulebook rule. */
export function ruleEvidence(rule: RegulatoryRule): Evidence {
  return {
    source: `reg:${rule.authority.toLowerCase().replace(/\s+/g, "-")}/${rule.id}`,
    ref: rule.ref,
    snippet: `${rule.summary}${rule.verifyBeforeLive ? " [confirm before live use]" : ""}`,
  };
}

// --- Pure date math (UTC, day precision) -----------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse an ISO date or timestamp to UTC midnight of that calendar day. */
export function toUtcDay(iso: string): number {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ISO date: "${iso}"`);
  }
  return Date.UTC(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth(),
    parsed.getUTCDate(),
  );
}

/** ISO yyyy-mm-dd for a UTC-midnight epoch value. */
function isoDate(utcDayMs: number): string {
  return new Date(utcDayMs).toISOString().slice(0, 10);
}

/** Whole calendar days from `fromIso` to `toIso` (negative when past). */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toUtcDay(toIso) - toUtcDay(fromIso)) / DAY_MS);
}

// Urgency tiers, in days remaining. Inclusive thresholds.
const URGENCY_CRITICAL_DAYS = 7;
const URGENCY_SOON_DAYS = 14;

function urgencyFor(daysRemaining: number): DeadlineAssessment["urgency"] {
  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= URGENCY_CRITICAL_DAYS) return "critical";
  if (daysRemaining <= URGENCY_SOON_DAYS) return "soon";
  return "open";
}

/**
 * Assess a rule's window against a basis date and "today". Pure: same inputs,
 * same assessment. `deadline` = basis + rule.days (calendar days, inclusive).
 */
export function assessDeadline(
  rule: RegulatoryRule,
  basisIso: string,
  todayIso: string,
): DeadlineAssessment {
  const basisDay = toUtcDay(basisIso);
  const deadlineDay = basisDay + rule.days * DAY_MS;
  const daysRemaining = Math.round((deadlineDay - toUtcDay(todayIso)) / DAY_MS);

  return {
    kind: rule.kind,
    basis: isoDate(basisDay),
    deadline: isoDate(deadlineDay),
    daysRemaining,
    urgency: urgencyFor(daysRemaining),
    ruleRef: ruleEvidence(rule).source,
  };
}
