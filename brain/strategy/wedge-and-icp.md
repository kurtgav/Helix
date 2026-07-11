---
name: wedge-and-icp
type: strategy
updated: 2026-07-12
---

# Wedge & ICP

## The wedge (v0)
**Helix Eligibility & Pre-Authorization Agent.**

At/near the point of intake, for each patient with HMO/PhilHealth coverage, the agent:
1. **Verifies eligibility** against the payer (HMO plan / PhilHealth membership + benefit).
2. **Determines requirements** — does this service need an LOA / pre-auth? Which docs?
3. **Drafts the LOA request** + assembles the required document set.
4. **Flags gaps** ("missing referral", "expired member ID", "service not covered under this plan") **before service is rendered.**
5. **Tracks status** to approval, and hands denials to the [[agent-catalog|Revenue Cycle Agent]] later.

**Why this wedge wins:**
- Attacks the highest-measurable loss (denied claims) at the only moment it's cheap to fix (pre-service).
- Works even when the clinic has **no HIS** — it only needs patient + coverage + service inputs.
- Human stays in control: agent drafts + recommends; staff approves/submits. (See [[security-and-compliance]].)
- Produces a hard ROI number from day one: denials prevented × avg claim value + hours saved.

## Ideal Customer Profile (Phase 1)
**Primary:** independent **diagnostic centers, laboratories, and imaging centers** in Metro Manila / urban PH.
- High volume of HMO-covered walk-ins → eligibility/LOA is a daily, repetitive pain.
- Owner-operated → short sales cycle, one decision-maker.
- Underserved by enterprise software → greenfield, low incumbent lock-in.

**Also strong:** dialysis centers (recurring, high-cost, HMO/PhilHealth-heavy), multi-branch clinics.

**Buyer:** clinic owner / medical director, or the admin/finance lead who feels the denials.

**Not yet:** large private hospitals (Epic/Cerner/local HIS incumbents, long sales cycle) — Phase 2. See [[problem-validation]].

## Why now
- LLMs can now read messy referrals/IDs/forms and reason over payer rules reliably enough for a **draft-then-human-approve** loop (not autonomous clinical decisions).
- PH digital-health + e-claims momentum increases payer-side structure to integrate with.
- Labor cost of manual verification is rising; clinics want throughput.

## Land → expand
Land with Eligibility/Pre-Auth → expand to Denials/Revenue-Cycle → Documentation → Reception → the department AI workforce ([[agent-catalog]]). Each new agent reuses the same integration + human-approval + audit substrate ([[system-architecture]]).
