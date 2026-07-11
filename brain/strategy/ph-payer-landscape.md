---
name: ph-payer-landscape
type: strategy
updated: 2026-07-12
status: draft — assumptions flagged, confirm with real users/payer docs
---

# PH Payer Landscape (the actual friction)

> ⚠️ This encodes working assumptions about PH payer processes. Each `⚠️` must be confirmed against current payer documentation and real clinic staff before it drives a real (non-mock) adapter. Do **not** ship real payer automation on unconfirmed rules.

## Two payer worlds a PH clinic deals with

### 1. PhilHealth (government, universal)
- National social health insurance. Most patients have some PhilHealth membership.
- Claims flow via **eClaims** (electronic submission); benefits via case rates / packages; **Konsulta** primary-care package for accredited providers.
- ⚠️ VALIDATE: exact eligibility-check + eClaims submission interface available to a small diagnostic center; accreditation requirements; which services are package-covered vs not.
- Friction: membership/eligibility verification, correct package/case-rate selection, required forms (e.g., member data, claim forms), denials from mismatched codes or missing docs.

### 2. Private HMOs (employer-sponsored, the daily walk-in reality)
Major PH HMOs the agent must model:
- **Maxicare**, **Intellicare**, **Medicard**, **PhilCare**, **ValuCare**, **Cocolife**, **Etiqa**, **EastWest Healthcare**, **Avega**, plus insurer-linked plans.
- Typical flow for HMO-covered service: verify member is **active + eligible for this benefit**, confirm whether an **LOA (Letter of Authorization)** / approval is required, gather required docs (member ID, valid ID, referral/consult, doctor's request), obtain LOA, render service, then bill the HMO.
- ⚠️ VALIDATE per payer: portal vs. call-center vs. email/fax for verification + LOA; LOA validity window; which services are auto-covered vs. need approval; accreditation.

## The insight that shapes the product
Each payer = a different **process, interface, and rule set**, but the **shape is identical**:
`verify eligibility → determine requirements → assemble docs → request authorization → track to decision.`

➡️ Model each payer as a **pluggable adapter** behind one interface (see [[system-architecture]], [[agent-catalog]]). The agent + rule engine stay payer-agnostic; adapters encapsulate the messy per-payer specifics. Start with **mock adapters** driven by fixtures so we build the full flow without waiting on payer access, then swap in real integrations behind a feature flag once confirmed.

## Adapter capability matrix (target)
| Payer | verify eligibility | get requirements/LOA rules | submit LOA | check status | integration mode (⚠️ confirm) |
|---|---|---|---|---|---|
| PhilHealth | mock→real | mock→real | n/a/case-rate | mock→real | eClaims / portal |
| Maxicare | mock→real | mock→real | mock→real | mock→real | portal/API? |
| Intellicare | mock | mock | mock | mock | portal? |
| Medicard | mock | mock | mock | mock | portal? |
| others | mock | mock | mock | mock | tbd |

## Compliance overlay
Patient + coverage data = **sensitive personal information** under the **Data Privacy Act of 2012 (RA 10173)**, regulated by the **NPC**. Consent, purpose limitation, security measures, breach notification all apply. See [[security-and-compliance]].
