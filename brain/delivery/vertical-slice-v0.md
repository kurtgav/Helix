---
name: vertical-slice-v0
type: delivery
updated: 2026-07-12
---

# Vertical Slice v0 — Eligibility & Pre-Auth Agent

**Definition of done (the loop's stop condition for v0):**
A staffer at a PH diagnostic center can, for a walk-in patient:
1. Enter patient + coverage + requested service (few fields, few clicks).
2. Click **Verify** → Helix checks eligibility via a payer adapter (mock), applies payer requirement rules, and returns: **eligible? / benefit / LOA needed? / missing docs / drafted LOA** with cited evidence.
3. Review, edit, and **Approve** → Helix records the action, marks LOA ready/submitted (mock), and logs everything to the immutable audit trail.
4. See a running **ROI panel**: checks done, denials likely prevented, hours saved, avg time-to-verify.

All on synthetic data. Real payer integration is behind a flag and out of scope for v0.

## Acceptance criteria
- [ ] Monorepo builds + typechecks + lints clean
- [ ] DB schema + migrations for orgs/users/patients/coverage/encounters/services/eligibility_checks/loa_requests/documents/payers/audit_log
- [ ] Payer adapter interface + mock PhilHealth + mock Maxicare with realistic fixtures
- [ ] EligibilityAgent: retrieve → rules → LLM draft (cited) → gaps → ProposedAction; human-approval gate enforced
- [ ] Web flow: intake → verify → result card → LOA draft → approve; minimal clicks
- [ ] RBAC + immutable audit on every agent run + approval; no PHI in logs
- [ ] Tests ≥80% (rule engine, adapters, agent, flow) + 1 e2e happy path + a11y check
- [ ] ROI instrumentation + seeded demo org ("Helix Diagnostics, Makati")
- [ ] `README` + `.env.example` + one-command dev bootstrap

## Explicitly NOT in v0
Real payer APIs · multi-agent orchestration · mobile · billing/ERP integration · clinical anything · other agents.

## Demo script (what we show a clinic owner)
"Walk-in with Maxicare needs an MRI. Type 4 fields, click Verify. Helix says: active, MRI needs LOA, referral missing, and here's the drafted LOA. Approve. Logged. This month it caught 37 would-be denials worth ₱X and saved 22 hours." → that's the sale ([[business-model]]).
