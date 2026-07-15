---
name: receivables-and-scale
type: strategy
updated: 2026-07-15
model: claude-fable-5
run: iteration-10
confidence: high
source: 26-search web research pass (2026-07-15), cross-verified ≥2 outlets per load-bearing figure; primary regulatory sources for the encoded rules
---

# Receivables Intelligence & the Scale Thesis

> Iteration-10 deep analysis: what Helix should build beyond the wedge, validated
> against what PH/SEA clinic software already ships — and how Helix scales.
> Verdict encoded as [[decisions|ADR-012]]; rules live in `@helix/payers`.

## 1. The validated pain: payers sit on clinic money

- **PhilHealth backlog is quantified and political:** ₱59.6B in denied + returned
  claims accumulated 2018–2024 (₱37.1B denied across 3.5M claims + ₱22.5B RTH);
  a House probe launched Jan 2025 ([BusinessWorld](https://www.bworldonline.com/the-nation/2025/01/22/648261/house-bill-grants-amnesty-to-hospitals-amid-p59-6-b-unpaid-philhealth-claims/)).
  **₱4.49B / 2.17M RTH claims died un-refiled** — PhilHealth's own CEO attributes
  it to providers not knowing their claims were appealable
  ([GMA](https://www.gmanetwork.com/news/topstories/nation/933720/philhealth-p4-4b-return-to-hospital-claims-unappealed/story/)).
  **30% of all denials were pure late filing** against the 60-day window
  ([PhilHealth](https://www.philhealth.gov.ph/news/up/article/2025/news_686f4fdd1ae54.php)).
  This is a *workflow* failure — software-shaped, not policy-shaped.
- **HMO delays are the SME clinic's cash killer:** the HMO industry lost ₱4.27B in
  2023 as benefits paid jumped 26% ([Philstar](https://www.philstar.com/business/2024/03/21/2342019/hmos-incur-higher-p43-billion-losses-2023));
  slow-paying providers is the margin release valve. Documented case: a Parañaque
  pediatric clinic paid **~18 months late** on a ₱300 consult — the doctor stopped
  accepting HMOs ([radar.ph](https://radar.ph/doctor-stops-accepting-hmo-after-18-month-delay-in-%e2%82%b1300-consultation-payout/)).
  AHMOPI-template provider terms put physician outpatient claims at 45–60 days
  payable ([template](https://www.scribd.com/document/211030467/HMO)); reality routinely overshoots.
- **The regulatory hooks exist but nobody operationalizes them clinic-side:**
  PhilHealth must act on clean claims within 60 days (IRR of RA 7875 §47,
  recognized in *PHIC v. Urdaneta Sacred Heart Hospital*, G.R. No. 214485, Jan 2021);
  IC CL 2024-01 lists "failing to affirm or deny claims within a reasonable time"
  as an unfair claims settlement practice; CAMS (IMC 2023-01) expects HMO
  complaint resolution in 7–45 working days. No PH clinic product cites any of
  this when chasing money.

## 2. Novelty check (what is generic vs. missing)

**Already table stakes in PH — do NOT pitch as differentiators:** EMR/scheduling/
queueing/SOA (SeriousMD, Bizbox, Medcurial), PhilHealth eClaims submission +
status dashboards (Bizbox Beacon), HMO eligibility swipe (MediLink), member-side
LOA apps (every major HMO), teleconsult (commoditized; KonsultaMD absorbed into
mWell).

**Absent clinic-side in PH/SEA (verified by targeted search, absence-of-evidence
caveats logged):**

| Candidate | PH/SEA status | US analog |
|---|---|---|
| Payer payment-behavior analytics ("which HMO pays late") | **absent** — SeriousMD tracks claims, doesn't score payers; MediLink is payer-owned and won't publish payer lateness | Waystar payer analytics, Rivet |
| Cited denial-appeal / MR automation | **absent** — Bizbox charts denial reasons, drafts nothing | Waystar/Adonis appeal automation, SmarterDenials |
| Cash-flow forecast from the claims pipeline | absent (derivative of the ledger) | Adonis |
| Cross-clinic payer benchmarking | absent; needs multi-tenant scale — sequence later | Rivet/industry benchmarks |

SEA players (HealthMetrics MY/ID, Smarter Health SG) automate claims **for
insurers/corporates** — the opposite seat. The clinic-side payer-accountability
seam is empty.

## 3. The decision: Receivables Agent (teammate #3)

Research recommended "denial recovery autopilot" as the top wedge — but Helix
**already ships its core**: deadline-aware denial triage with verified MR/RTH
windows and cited drafts ([[decisions|ADR-011]], /revenue). The genuinely missing
layer — and the one that compounds everything — is the other side of the clock:

**Track every submitted claim against the payer's OWN payment obligation.**

- The rulebook gains payer-side rules: PhilHealth 60-day action window
  (verified: IRR §47 + G.R. 214485) and an HMO contractual default (45 days,
  AHMOPI-informed, `reported`, `verifyBeforeLive`) — same confidence-graded,
  citable shape as ADR-011.
- A pure ledger engine assesses standings (on-track / due-soon / overdue /
  settled / underpaid / denied→triage), scores each payer's **measured**
  behavior (median days-to-pay, on-time rate, shortfall rate, denial rate,
  A–D grade; overdue money caps the grade), and projects collections from
  observed behavior with rulebook fallback.
- Overdue money gets a **cited follow-up draft** — a status follow-up, never a
  demand (the cited windows except claims under investigation) — behind the
  same human-approval gate as every agent.
- Why it serves both ends of the market: SME clinics live or die on cash
  (see the 18-month ₱300 case); multi-branch clinics and chains get contract-
  renegotiation ammunition ("your measured median is 72 days against a 45-day
  contract").
- Why it's a moat-compounder: every settled claim enriches payer-behavior data
  → cash forecasting → (at multi-tenant scale) cross-clinic payer benchmarking,
  the network-effect feature nobody in PH can fast-follow without the ledger.

## 4. How Helix scales (researched, not vibes)

1. **Regulation is the distribution channel.** PhilHealth decommissioned
   eKonsulta (July 2026); every YAKAP-accredited primary-care clinic must run a
   PhilHealth-certified EMR — certification became a state-issued lead list
   ([PA2025-0077](https://www.philhealth.gov.ph/advisories/2025/PA2025-0077.pdf),
   [PNA](https://www.pna.gov.ph/articles/1265638)). eClaims 3.0 is mandatory.
   Same historical pattern made Bizbox the hospital default (HITP accreditation).
   → Helix should treat payer-rail certifications as GTM milestones, not
   compliance chores.
2. **Freemium doctor-first, monetize the money flow.** SeriousMD grew free-first
   because PH doctors won't pay to try; it monetized workflow + partnerships.
   Helix's analog: the verify/LOA wedge lands, the **receivables ledger retains**
   — AR data accumulating in-system is the hardest thing to rip out.
3. **Don't out-build conglomerates on their turf.** mWell (Metro Pacific),
   AC Health (Ayala), Maxicare/MediLink self-solve internally (Healthway built
   its own LOA portal). Sell to independents, group practices, diagnostic/
   dialysis chains; white-label to chains later.
4. **Stickiness = compliance + money flow, not UI.** Teleconsult and booking
   churn (commoditized). Claims/AR history + payer scorecards + audit trails
   compound. The same shape repeats across SEA (fragmented private payers +
   national insurer) — the adapter/rulebook architecture is the portable asset.

## 5. Kill criteria & validation hooks

- ⚠️ VALIDATE with ~5 clinic interviews: actual HMO remittance formats, whether
  billers will send cited follow-ups (relationship fear), reconciliation pain
  (thinnest public evidence — flagged `assumed`).
- The HMO 45-day default MUST be replaced per-contract before any live use
  (`verifyBeforeLive` enforced in code).
- If interviews show clinics won't chase payers in writing even with citations,
  pivot the surface from "follow-up drafts" to "contract-renewal scorecards"
  (the data layer is identical).
- Related risks: [[risks-and-kill-criteria]] · market context:
  [[competitive-landscape]] · rule provenance: [[ph-denial-and-eligibility-rules]].
