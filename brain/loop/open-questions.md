---
name: open-questions
type: loop
updated: 2026-07-12
---

# Open Questions (validate with humans / payer docs)

## Blocking real GTM (not the prototype)
- [ ] Do Phase-1 ICPs run an HIS/EMR, or paper/Excel? → integration surface
- [ ] Top 3 real denial reasons at target clinics
- [ ] HMO mix per clinic (which payers to build real adapters for first)
- [ ] Hours/week currently spent on eligibility + LOA (baseline for ROI)
- [ ] Who signs the check + budget authority
- [ ] Willingness to pay + preferred pricing shape ([[business-model]])

## Blocking real (non-mock) payer integration
- [ ] PhilHealth eligibility/eClaims interface available to a small diagnostic center; accreditation
- [ ] Per-HMO verification + LOA channel (portal/API/call/email), LOA validity windows, covered-vs-approval service lists
- [ ] Data-sharing/consent language required by each payer

## Compliance / data
- [ ] NPC registration + consent flow specifics under RA 10173
- [ ] LLM provider zero-retention + data-residency options before any real PHI leaves region ([[security-and-compliance]])

> Until the payer/compliance items are answered: **synthetic data + mock adapters only.**
