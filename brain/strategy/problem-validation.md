---
name: problem-validation
type: strategy
updated: 2026-07-12
status: draft — needs real-user confirmation
---

# Problem Validation

> Rule: validate the problem **before** building. This doc is the honest, adversarial pass. Assumptions are flagged `⚠️ VALIDATE`.

## The claimed problem
PH healthcare orgs (clinics, diagnostic centers, labs, dialysis, imaging, dental) lose money and staff hours to **administrative friction**: registration, insurance/HMO eligibility, pre-authorization (LOA), claim denials, reimbursement delays, document processing, compliance/SOP retrieval, scheduling, manual data entry across fragmented systems.

## Adversarial questions (YC lens)

### 1. Is the "layer on top of existing software" thesis even true here?
The Stripe/Cursor analogy assumes a **substrate exists** to sit on top of.
- ⚠️ VALIDATE: Many PH **small** clinics/diagnostic centers do **not** run a real HIS/EMR. They run on paper, Excel, Google Sheets, or a thin billing app.
- **Implication:** For Phase-1 ICP, Helix cannot assume a rich HIS API to integrate with. The thing that *does* exist and *is* painful is the **payer side**: PhilHealth eClaims and each HMO's portal/LOA process. That is the real substrate.
- **Corrected thesis:** Helix sits on top of the **payer + document reality**, not necessarily a hospital HIS. Where an HIS exists, we integrate; where it doesn't, we are the thin action layer that still never becomes the system of record.

### 2. Where is the money actually bleeding?
Ranked by measurable peso impact for a diagnostic center / clinic:
1. **Denied / rejected claims** — service rendered to an ineligible patient, or missing LOA/docs → payer refuses to pay → clinic eats the cost. Highest, most measurable.
2. **Pre-auth (LOA) delays** — patient waits, or leaves; throughput lost.
3. **Reimbursement lag** — cash flow pain, but not "lost" money.
4. **Staff hours** on manual eligibility checks + resubmissions.
> The sharpest, most provable wedge attacks **#1 and #2 before service is rendered.** See [[wedge-and-icp]].

### 3. Would they pay?
- Small clinics are price-sensitive. "AI" is not a budget line. **"Recover ₱X in denied claims / month"** and **"save Y hours/week"** are.
- Pricing must be ROI-anchored (share-of-recovery or per-seat that is < recovered value). See [[business-model]].
- ⚠️ VALIDATE: willingness-to-pay via 5–10 real clinic interviews before heavy build.

### 4. Is it 10x better than the status quo?
Status quo = staff manually logging into HMO portals / calling to verify eligibility, hand-filling LOA forms, discovering denials weeks later. An agent that verifies + drafts LOA + flags missing docs at intake is plausibly 10x on time-to-verify and denial rate. ✅ credible.

### 5. Can it be a billion-dollar company?
- PH health expenditure is large and growing; thousands of clinics/labs + hospitals.
- Expansion: same payer-friction pattern across SEA (different payers, same shape).
- Land-and-expand: start with one agent, grow to the department-AI-workforce vision ([[agent-catalog]]). ✅ credible venture shape *if* wedge lands.

## Verdict
**Proceed — but narrow.** The generic "AI OS for all hospital ops" is the 10-year vision, not the v0. v0 = one agent that provably prevents denied claims for PH diagnostic centers/clinics. Build that, instrument the ROI, earn the right to expand.

## Must-validate-with-humans (blocking real GTM, not blocking prototype)
- [ ] Do target ICPs have an HIS/EMR, or paper/Excel? (determines integration surface)
- [ ] Top 3 denial reasons they actually experience
- [ ] Which HMOs dominate their patient mix
- [ ] Current time spent/week on eligibility + LOA
- [ ] Who signs the check (owner-doctor? admin? finance?)

See [[open-questions]].
