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

## Acceptance criteria — ✅ v0 SHIPPED (2026-07-12)
Verified green: typecheck 8/8 · **162 tests pass** · lint 8/8 · `next build` ✓ · end-to-end seam smoke ✓.
- [x] Monorepo builds + typechecks + lints clean — `pnpm typecheck` 8/8, `pnpm lint` 8/8, `next build` ✓
- [x] DB schema + migrations (11 tables) — Drizzle schema + generated `drizzle/0000_*.sql` with an **append-only trigger** on `audit_log`
- [x] Payer adapter interface + mock PhilHealth + mock Maxicare with realistic fixtures — repository pattern; `live` mode hard-blocked
- [x] EligibilityAgent: retrieve → rules → LLM draft (cited, re-validated) → gaps → ProposedAction; human-approval gate always on
- [x] Web flow: intake → verify → result card → LOA draft → approve — Next.js, `next build` clean, seam verified end-to-end (eligible→approve→LOA submitted; inactive→ineligible; double-approve blocked)
- [x] RBAC + immutable audit on every agent run + approval; no PHI in logs — viewer cannot approve; two PHI leaks (audit snippets, memberId→LLM) caught + fixed by the swarm
- [x] Tests ≥80% on core logic (rules, adapters, agent, rbac, metrics, PHI hygiene) — 162 tests
- [x] ROI instrumentation + seeded demo org ("Helix Diagnostics, Makati") — deterministic seed, `computeRoi` dashboard
- [x] `README` + `.env.example` + dev bootstrap (`pnpm install && pnpm dev`)

### Known follow-ups (not blocking v0 demo; next iteration)
- Playwright happy-path is a stub (needs `playwright install`); e2e currently proven via the seam smoke + `next build`.
- a11y is built-in (semantic HTML, labels, `aria-live`, focus states) but not yet asserted by an automated axe run.
- Auth substrate: web uses a single hard-coded demo `staff` actor; real authN/authZ wiring is [[open-questions|task #8 follow-up]].
- Real (non-mock) payer adapters remain gated on confirmed payer rules — see [[ph-payer-landscape]] / [[open-questions]].

## Explicitly NOT in v0
Real payer APIs · multi-agent orchestration · mobile · billing/ERP integration · clinical anything · other agents.

## Demo script (what we show a clinic owner)
"Walk-in with Maxicare needs an MRI. Type 4 fields, click Verify. Helix says: active, MRI needs LOA, referral missing, and here's the drafted LOA. Approve. Logged. This month it caught 37 would-be denials worth ₱X and saved 22 hours." → that's the sale ([[business-model]]).
