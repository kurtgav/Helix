---
name: ph-denial-and-eligibility-rules
type: strategy
updated: 2026-07-15
status: researched — primary sources cited; every ⚠️ stays mock-only until confirmed per contract
model: claude-fable-5
run: iteration-9
confidence: high for PhilHealth statutory/circular rules; medium for HMO operating defaults (contractual)
source: primary-source web research (PhilHealth circulars, RA texts, IC circulars, official payer handbooks) — 3 research passes, 2026-07-15
---

# PH Denial Dates & Eligibility Rules (the researched rulebook)

> The facts behind `packages/payers/src/knowledge/phRules.ts` (the cited knowledge
> module) and the policy engine in `services/agents/src/policy/engine.ts`. Every
> rule the product asserts traces to a row here; every row carries its source and
> confidence. Encodes **administrative** windows and terms only — no clinical rules.
> See [[ph-payer-landscape]] for the payer map and [[decisions]] ADR-011 for the
> architecture commitment.

## 1 · PhilHealth deadlines (verified, primary sources)

| Rule | Window | Source | Confidence |
|---|---|---|---|
| Claim filing | **60 calendar days from discharge** | RA 7875 §35 (as amended by RA 10606 §25); 2013 Revised IRR §46 | verified (statute read verbatim) |
| Fortuitous-event filing | **120 days** + other privileges, on PRO request after a calamity declaration | PhilHealth Circular 2020-0007 (Rev. 1) | verified |
| Motion for reconsideration of a denied/reduced claim | **15 calendar days from receipt of denial notice**, filed with the PRO | PhilHealth Circular No. 03, s. 2008 (Rule I §2) | verified |
| Final appeal after MR denial | **15 calendar days** to PARD; PARD resolution final save Rule 43 (CA) | PC 03 s. 2008 (Rule II §8, §12) | verified |
| Return-to-Hospital (RTH) refile | **60 days from receipt of the RTH notice**, else denied | PC 2018-0014 §V.F; ACR Policy No. 2 | verified |
| eClaims mandatory | since 2018-01-01 (claim series number = proof of receipt) | PC 2017-0030 | verified |
| PhilHealth's own processing norm | ~60-day IRR norm; 2025 self-reported average TAT 22–25 days | IRR §47 (not independently OCR'd); PhilHealth news 2025 | medium |

**Corrections captured (why research-first mattered):**
- The 60-day filing rule is **statutory**, not from Circular 2018-0014 (that circular carries the RTH/CF4 documentary rules).
- The MR window is **15 days — not 60**. A widely-circulated secondary claim of "60 days to protest before PRO-CRC" has no primary source and conflicts with PC 03 s. 2008; Helix encodes 15 as the safe compliance deadline.
- **2025–2026 amnesty:** PC 2025-0006 + PC 2025-0019 allowed reprocessing of 2018–2024 claims denied solely for late filing (~1.1M claims, ~₱8.8B) with refiling until **2026-03-31 — that window is now closed**; late-filing denials are again governed by the standard rules above.

## 2 · HMO denial & window reality (IC-regulated, mostly contractual)

- **No IC circular fixes an HMO claims settlement or denial deadline.** CL 2016-41 is the capitalization/liquidity circular (superseded by CL 2025-11); the binding consumer timelines are the FCPA CAMS rules — IMC 2023-01: acknowledge 2 wd, resolve simple 7 wd / complex 45 wd. HMOs are IC-supervised since E.O. 192 (2015); no HMO Code enacted as of 2026-07 (HB 7130 pending would mandate 30-day clean-claim payment to providers). ⚠️ per-HMO contract remains the operative document.
- **Reconsideration windows are payer-set.** Documented: MediCard accepts a written appeal within **10 working days** of a denial (official customer charter). Helix's operating default is a 30-day ceiling, flagged `assumed` + `verifyBeforeLive`.
- **Escalation path:** payer grievance → IC complaint (CAR form to PAMD; AHMOPI/PAHMOC members get 30-day association mediation per CL 2018-14) → IC adjudication (HMO benefits disputes listed without a peso cap; small-claims track ≤ ₱1M) → Rule 43 to the CA. Provider-vs-HMO contract disputes are **outside** IC adjudication — civil courts/arbitration per contract.
- **LOA validity is payer-specific, not an IC rule:** Maxicare **30 days** from issuance (official); PhilCare **3 calendar days** (official); MediCard/Intellicare unpublished (secondary: ~3 days; Intellicare RCS 3 days, Cocolife LOA up to 3 days). Helix default: conservative **3 days**, always overridden by the per-payer value. The "LOAs are valid 30 days" folk rule is Maxicare-specific.
- **Filing windows (member-reimbursement, official):** Maxicare/MediCard/Intellicare/Avega **30 days** from availment/discharge; InLife iCare **60 days**. Provider-side windows live in unpublished accreditation agreements ⚠️. Helix default: **30 days**, `verifyBeforeLive`.

## 3 · Eligibility: corporate/group vs individual/family policies

**Regulatory ceiling (verified):** IC CL 2018-65 (extended to HMOs via CL 2018-66) — PEC waiting period **max 1 year** from effectivity; look-back **max 2 years**; after 1 year of continuous coverage the PEC exclusion lifts for covered diseases; disclosed-and-accepted PECs coverable from day 1; free-look 15 days (not mandatory for group).

| Dimension | Corporate / group | Individual / family |
|---|---|---|
| Underwriting | account-level, experience-rated; member underwriting generally absent | per-member medical underwriting (e.g. Maxicare lab battery from age 49y6m) |
| PEC | typically covered/waived per master policy (e.g. MaxicarePLUS SME covers PEC to full MBL from day 1 at 10+ heads); Intellicare default excludes PEC for first 12 months unless the account buys it | year-1 exclusion or peso sub-limits (MyMaxicare: PEC capped ₱5k–20k year 1, dreaded PEC capped permanently; Medicard Standard: covered only from year 2; PhilCare prepaid: excluded outright) |
| Waiting periods | usually none beyond effectivity | activation waits 4–7 days (PhilCare, Maxicare, Etiqa); ACU after 6 months (Maxicare) |
| Benefit limits | MBL per illness per year, ₱250k–500k typical SME tiers | MBL ₱100k–250k tiers; prepaid products use one-time ABLs (₱40k–80k) |
| Termination | co-terminus with employment — separation kills coverage immediately | lapse on non-payment; ~30/31-day grace is industry standard (Etiqa 31d contractual; iCare 30d; Maxicare implied ~30d + ₱500 reactivation penalty) |
| Age | per master policy; overage dependents employee-paid | entry caps ~60–65 (Etiqa to 70, terminates at 71) |
| Dependents | employer-defined hierarchy, enrollment windows 30 days from event | mandatory hierarchy (spouse→children / parents→siblings), child deps to 21–23 |

**Point-of-service "not eligible" taxonomy (documented across payer handbooks):** inactive/terminated employment (group) · premium lapse/suspension (individual) · MBL/ABL exhausted · service not in plan · provider not accredited/excluded · LOA/RCS expired · PEC/exclusion flag · unpaid arrears during grace. The policy engine's checks mirror this list — coverage window, waiting period, PEC, benefit limit — and the unknown-member path routes to a human.

## 4 · What Helix encodes vs. flags

- **Encoded deterministically (cited):** PhilHealth 60d filing / 15d MR / 60d RTH; HMO 30d filing + 30d reconsideration defaults (`assumed`, `verifyBeforeLive`); LOA validity default 3d with per-payer override; PEC ceiling citation (CL 2018-65); group-vs-individual policy terms as **fixture data** per plan (waiting days, PEC months, MBL, LOA validity).
- **Flagged, never decided:** whether a specific service relates to a pre-existing condition (clinical — `attention`, human reviews); any live payer action on `assumed`/`reported` rules (registry still throws on `live`, ADR-004 unchanged).
- **Kill-criteria tie-in:** if real contracts show per-payer windows diverging so much that fixtures can't model them, that pressure-tests the adapter thesis — see [[risks-and-kill-criteria]].
