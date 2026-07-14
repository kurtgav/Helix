// ROI estimation primitives — the economic assumptions that turn raw
// administrative activity into the ₱/hour figures Helix actually sells. Every
// constant here is a DELIBERATE, defensible baseline: it must survive a skeptical
// clinic administrator asking "where did that number come from?". Kept pure and
// isolated from aggregation so the assumptions live in ONE auditable place and
// are unit-tested on their own. No I/O, no mutation, deterministic.

import type { Gap } from "@helix/shared";

/**
 * Average Philippine claim/service value (in PHP ₱) by service code — used to
 * value a denial we prevented. These are conservative, order-of-magnitude
 * figures for common PhilHealth/HMO services (case rates, not billing truth):
 * a defensible basis for "pesos recovered" that we refine per-org once real
 * claim data lands. `Readonly` because the economic baseline must never be
 * mutated at runtime — the ROI number has to be reproducible from the same
 * inputs (this is the flagship metric; integrity beats convenience).
 */
export const PH_SERVICE_CLAIM_VALUES: Readonly<Record<string, number>> = {
  "MRI-BRAIN": 12000,
  CBC: 850,
  "HD-SESSION": 4200,
  "CONSULT-IM": 700,
};

/**
 * Fallback claim value (₱) for a service code we have no baseline for. Chosen
 * middle-of-the-road: high enough that unrecognized services still register
 * economic value, low enough not to overstate ROI on an unknown code.
 */
export const DEFAULT_CLAIM_VALUE = 1500;

/**
 * Manual verification time displaced per eligibility check, in HOURS
 * (≈7 minutes). A staff member phoning a payer hotline or logging into a member
 * portal to confirm one patient's eligibility is the baseline Helix beats;
 * every automated check reclaims roughly this much admin time.
 */
export const MANUAL_BASELINE_HOURS = 0.117;

/**
 * Admin time saved per LOA (Letter of Authorization) draft, in HOURS
 * (15 minutes). Hand-drafting a pre-authorization letter — pulling member
 * details, service codes, and required documents into payer-specific prose — is
 * the manual task an auto-generated draft displaces.
 */
export const LOA_DRAFT_HOURS = 0.25;

/**
 * Assumed verification duration (ms) for a persisted check with no recorded
 * `durationMs`. Check latency is not yet captured at write time (see
 * packages/db/src/roi.ts), so aggregation substitutes this so avgTimeToVerifyMs
 * reflects a realistic sub-2-second automated check instead of a misleading 0.
 */
export const DEFAULT_VERIFY_MS = 1800;

/**
 * Value a single service/claim for ROI purposes. Looks up the per-service
 * baseline and falls back to {@link DEFAULT_CLAIM_VALUE} for codes we don't
 * track. Pure and total: any string in, a finite peso figure out.
 *
 * @param serviceCode the encounter's service code (e.g. "MRI-BRAIN")
 * @returns the peso value attributed to preventing this service's denial
 */
export function estimateClaimValue(serviceCode: string): number {
  // `noUncheckedIndexedAccess` types this lookup as `number | undefined`; the
  // `??` guarantees a number for unknown codes without ever throwing.
  return PH_SERVICE_CLAIM_VALUES[serviceCode] ?? DEFAULT_CLAIM_VALUE;
}

/**
 * Did this check catch a would-be denial? A gap flagged `blocking` is one that
 * WOULD have caused the payer to reject the claim had it reached submission, so
 * catching it pre-submission is precisely a denial prevented. Non-blocking
 * (informational/soft) gaps don't count — they wouldn't have sunk the claim.
 *
 * @param gaps the gaps a persisted eligibility check recorded
 * @returns true iff at least one gap is blocking
 */
export function isDenialPrevented(gaps: readonly Gap[]): boolean {
  return gaps.some((gap) => gap.blocking === true);
}
