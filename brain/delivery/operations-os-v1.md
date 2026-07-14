---
name: operations-os-v1
type: delivery
updated: 2026-07-15
status: shipped (local, verified green) · not deployed (awaiting human ok)
---

# Operations OS v1 — the AI operating layer, made real

Iteration 6 elevated Helix from "one live agent + a seeded ROI panel" to a coherent **operations OS**: a live ROI engine, a visible immutable audit console, a *second* AI teammate, real RBAC enforcement, and a world-class product surface — all inside the guardrails (mock adapters, synthetic data, no real PHI, no autonomous deploy). See [[journal]] · [[system-architecture]] · [[agent-catalog]].

## What "product OS" means here
Not a marketing word. Concretely: a shared substrate — approval gate, immutable audit, RBAC, retrieval, ROI/events, payer adapters — that **every agent reuses**, so teammate N+1 is cheap and the whole thing reads as one operating layer, not a bag of tools. v1 makes that legible on-screen. Thesis + moat: [[product-os-thesis]] · [[competitive-landscape]].

## Surfaces shipped
- **`/dashboard`** — ROI now **live** from persisted encounters (honest Live/Demo badge). The number we sell, computed from real rows.
- **`/console`** — recent activity + the **immutable audit trail made visible** (append-only ledger with agent model+prompt provenance). PHI-minimized: never renders a patient name. The trust centerpiece.
- **`/revenue`** — the **Revenue Cycle Agent** (catalog #2): denial triage → recoverable? → fixes → cited resubmission draft, with a human `resolve` gate. Agents propose, humans dispose.
- **`/agents`** — the AI workforce roster + an Executive daily brief (from live ROI). The land→expand story on one screen.
- **`/`** and **`/verify`** — marketing retold as an operating-layer + workforce story; the verify flow rebuilt into a trustworthy "decision" surface.

## Substrate added (reused by every future agent)
- **ROI engine** — `@helix/core/roi` (pure `aggregateRoi` + estimate helpers) + `@helix/db/roi` (`computeRoiFromDb`). Pure core, thin I/O wrapper — fully unit-tested.
- **History readers** — `@helix/db/history` (recent encounters + audit trail), PHI-minimized by construction.
- **Identity + RBAC enforcement** — `@/lib/auth` demo substrate running real RBAC (route 403 **and** agent `assertCan`); rate limiting on write endpoints; a role switcher. Production swaps Supabase Auth behind `getSession()` without touching callers.
- **CSP nonce** — strict per-request nonce on dynamic app surfaces; standard CSP on the static landing.

## Acceptance — ✅ met (2026-07-15)
Verified green: typecheck 8/8 · lint 8/8 · **264 unit tests** · **46 Playwright e2e** (desktop+mobile) · `next build` ✓ (12 routes) · runtime smoke (all routes 200, nonce on dynamic pages, live ROI ₱36,000 from real DB, 0 PHI on the console).
- [x] Live ROI from persisted rows (closes iteration-5 gap)
- [x] Operations console with the immutable audit trail, PHI-free
- [x] Second agent (Revenue Cycle) live end-to-end with human-approval gate
- [x] Real RBAC enforced on endpoints + agents; rate limiting; role switcher
- [x] CSP nonce (branched: strict app / standard static marketing)
- [x] e2e + a11y automation (closes the Playwright/axe follow-up)
- [x] Adversarial review (security + React + a11y) triaged and fixed

## Known follow-ups / blockers (see [[open-questions]])
- **CRITICAL, pre-GTM:** the public demo runs against a live DB with only the demo cookie-role substrate → an anonymous visitor can self-escalate and write PII-shaped rows. A **deployment** decision (password-protect, disposable DB, or real auth) — not a code defect.
- Real (non-mock) payer adapters remain gated on confirmed payer rules ([[ph-payer-landscape]]).
- Rate limiter is per-instance/in-memory (best-effort) — move to a shared store (Redis/platform) for production.
- Multi-tenant hardening: add `orgId` predicates + Supabase RLS before a second org exists.
- Persist per-check `durationMs` so avg-time-to-verify is measured, not assumed.

## Explicitly NOT in v1
Real payer APIs · real authentication/IdP · multi-tenant · mobile · billing/ERP · clinical anything · agents #3–#8 (next).
