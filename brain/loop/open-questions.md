---
name: open-questions
type: loop
updated: 2026-07-12
model: claude-fable-5
run: iteration-6
confidence: high
source: accumulated unknowns; each is a validation target
---

# Open Questions (validate with humans / payer docs)

## 🚨 Security / deployment (iteration-6 review — TOP pre-GTM blocker)
> The RBAC substrate is correct and enforced at both layers (route 403 + agent `assertCan`). The risk is a **deployment posture**, not a code defect: the public preview runs against a live `DATABASE_URL` while identity is only a client-set demo cookie. An unauthenticated visitor can self-select `owner` and write PII-shaped rows to the real DB. **Decide before any wider sharing:**
- [ ] Public demo posture: password-protect the deployment (Vercel Deployment Protection), **or** point the public build at a disposable/wipeable DB, **or** ship real Supabase Auth behind `getSession()` (the substrate already accepts this swap without touching callers).
- [ ] Rate limiter is in-memory + per-instance (best-effort) and IP-key trusts `x-forwarded-for` — move to a shared store (Redis/platform WAF) before it's a real control.
- [ ] Multi-tenant hardening before a 2nd org exists: add `orgId` predicates to the approve read path + enable Supabase RLS (schema comments claim RLS the migration doesn't yet install).

## Blocking real GTM (not the prototype)
- [ ] Do Phase-1 ICPs run an HIS/EMR, or paper/Excel? → integration surface
- [ ] Top 3 real denial reasons at target clinics
- [ ] HMO mix per clinic (which payers to build real adapters for first)
- [ ] Hours/week currently spent on eligibility + LOA (baseline for ROI)
- [ ] Who signs the check + budget authority
- [ ] Willingness to pay + preferred pricing shape ([[business-model]])

## Blocking real (non-mock) payer integration
- [ ] PhilHealth eligibility/eClaims interface available to a small diagnostic center; accreditation
- [ ] Per-HMO verification + LOA channel (portal/API/call/email), covered-vs-approval service lists
  - ✅ *Researched (iteration 9):* statutory/circular deadlines + published LOA validity windows now cited in [[ph-denial-and-eligibility-rules]] and encoded in `@helix/payers` knowledge (PhilHealth 60d filing / 15d MR / 60d RTH verified; Maxicare LOA 30d + PhilCare 3d official). Still open: per-contract provider filing windows and each HMO's reconsideration window (`verifyBeforeLive` flags in code).
- [ ] Data-sharing/consent language required by each payer

## Compliance / data
- [ ] NPC registration + consent flow specifics under RA 10173
- [ ] LLM provider zero-retention + data-residency options before any real PHI leaves region ([[security-and-compliance]])

> Until the payer/compliance items are answered: **synthetic data + mock adapters only.**

## Strategic / competitive (from iteration-6 research)
> Context: [[product-os-thesis]] · [[competitive-landscape]]. These are the assumptions the competitive research could **not** settle from public sources — they need real clinics/payers.

- [ ] **Payer integration mode, per HMO + PhilHealth** — API vs portal vs email vs call-center? Decides whether the adapter substrate (our #1 claimed moat) is real software or long-lived RPA/human-assisted. **Highest-priority unknown.**
- [ ] **Is the seam actually unoccupied?** Public web shows white space (no clinic-side, PH-domestic payer-automation for HIS-less diagnostic centers). Confirm no quiet local incumbent, HMO in-house tool, or BPO internal automation already serves slices of it.
- [ ] **Local ROI vs a cheap admin clerk** — PH runs a 400+-firm healthcare-BPO industry at ~40–60% below US labor cost. What is the real peso value of denials-prevented + hours-saved when the manual alternative is cheap? Anchor ROI on **recovered denials**, not hours.
- [ ] **SeriousMD (+ other PH clinic EMRs)** — competitor, partner, or integration target? Do they already automate any eligibility/LOA step? Would clinics rather their EMR add this than adopt a standalone Helix?
- [ ] **Does the trust framing land locally?** US surveys show 99%/96% comfort with AI on prior-auth *with safeguards*. Validate that "human-approve + immutable audit + RBAC" reads as reassurance (not friction) to a PH clinic owner.
- [ ] **PhilHealth eClaims 3.0 deadline (~Apr 2026)** — does forced digitization create a buying trigger / integration opening for small diagnostic centers, or is it irrelevant to our ICP's daily HMO pain?
- [ ] **Model-provider disintermediation** — if frontier models make LOA-drafting trivial, is defensibility (adapters + decision-trace corpus + trust) genuinely enough? Revisit as models improve ([[product-os-thesis]] risks).
- [ ] **Does "operating layer / product-OS" language help or hurt the sale?** Test whether clinic buyers hear "platform bloat" vs a sharp point solution. The wedge must sell first; the OS is earned.
