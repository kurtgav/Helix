---
name: decisions
type: loop
updated: 2026-07-15
model: claude-fable-5
run: iteration-7
confidence: high
source: backfilled from [[journal]] iterations 0–6; kept current from iteration 7 onward
---

# Decision Log (ADRs)

> Append-only. Each entry: context → decision → consequence. Newest last.
> Format is deliberately terse — the [[journal]] carries the narrative; this file carries the *commitments*.

## ADR-001 · Wedge = payer friction, not HIS integration
- **When:** 2026-07-12 · iteration 0
- **Context:** The "AI layer on top of existing hospital software" thesis assumes an HIS exists. Phase-1 PH clinics often run paper/Excel — no substrate to integrate with ([[problem-validation]]).
- **Decision:** Build on top of the **payer + document reality** (PhilHealth + HMO eligibility/LOA/denials). Where an HIS exists we integrate; where it doesn't, Helix is the thin action layer. First product: Eligibility & Pre-Auth Agent ([[wedge-and-icp]]).
- **Consequence:** Payer adapters become the core substrate (and the moat candidate). No dependency on any HIS vendor to land the first customer.

## ADR-002 · Stack: TypeScript everywhere, boring where possible
- **When:** 2026-07-12 · iteration 0
- **Context:** Solo-loop velocity + one language across web/agents/packages ([[tech-stack]]).
- **Decision:** Next.js + Supabase/Postgres (pgvector later) + Drizzle + Zod + pnpm/turbo monorepo. LLM behind a `LLMProvider` abstraction (Claude primary, mock for dev). **In-process orchestration — no Temporal/queues yet (YAGNI).**
- **Consequence:** One `pnpm test`/`typecheck` gate covers everything; orchestration upgrade is a seam swap later, not a rewrite.

## ADR-003 · Agents propose, humans dispose
- **When:** 2026-07-12 · iteration 0
- **Context:** Trust is the product in healthcare admin. Autonomy without accountability kills the sale ([[security-and-compliance]]).
- **Decision:** Every agent action flows retrieve → reason → **draft (ProposedAction)** → human approve → act → **immutable audit**. No agent commits an external effect autonomously. Administrative reasoning only in v0 — no clinical decisions.
- **Consequence:** The approval engine + append-only audit log are shared substrate every agent must use; the audit trail becomes a decision-trace corpus (secondary moat).

## ADR-004 · Synthetic data + mock adapters until payer rules are confirmed
- **When:** 2026-07-12 · iteration 0
- **Context:** Real payer interfaces, consent language, and data-handling are unvalidated ([[open-questions]]); RA 10173 exposure if we guess.
- **Decision:** Ship the whole vertical slice against deterministic **mock** payer adapters and synthetic patients. No real PHI anywhere. Real adapters gate on confirmed payer rules ([[ph-payer-landscape]]).
- **Consequence:** Demos are safe and reproducible; the adapter interface is proven before any real integration is bought.

## ADR-005 · Postgres persistence behind a seam, in-memory fallback
- **When:** 2026-07-12 · iteration 5
- **Context:** Live persistence (Supabase) arrived mid-loop; the app must stay demoable offline and in CI.
- **Decision:** `@helix/db` repositories select by `DATABASE_URL`: set → Postgres (Supabase, pooled, `prepare:false`), unset → deterministic in-memory store. Same interfaces, same audit/approval semantics both sides.
- **Consequence:** e2e pins `DATABASE_URL=""` for determinism; production persistence is a config change, not a code path fork. Dashboard/console honestly badge **Live vs Demo**.

## ADR-006 · Demo identity substrate carrying REAL RBAC
- **When:** 2026-07-15 · iteration 6
- **Context:** Auth infra (IdP) is premature pre-GTM, but authorization must be real to be credible.
- **Decision:** Identity = one httpOnly demo-role cookie (`helix_role`); **authorization = the real core RBAC matrix** enforced at both the route (403) and agent (`assertCan`) layers. Production swaps Supabase Auth behind `getSession()` without touching callers.
- **Consequence:** A `viewer` truly cannot approve anywhere. Known exposure: the *demo* posture (cookie-selectable role) must never ship publicly against a live DB → ADR-007.

## ADR-007 · Public-demo deployment posture is a human call (pre-GTM blocker)
- **When:** 2026-07-15 · iteration 6
- **Context:** Public Vercel deploy + live `DATABASE_URL` + cookie-selectable role ⇒ an anonymous visitor could self-escalate and write PII-shaped rows ([[open-questions]] 🚨).
- **Decision:** The loop does **not** decide this autonomously. Options on the table: password-protect the deployment, point the public demo at a disposable DB, or ship real Supabase Auth. Until decided: no wider sharing of the live URL.
- **Consequence:** Deploys stay gated on explicit human ok (also a loop guardrail in [[runbook]]).

## ADR-008 · CSP split: strict nonce on dynamic app, standard on static landing
- **When:** 2026-07-15 · iteration 6
- **Context:** A statically-prerendered `/` cannot carry a per-request script nonce; the dynamic app surfaces can and should.
- **Decision:** Middleware mints a per-request nonce + `'strict-dynamic'` for every dynamic surface (no `'unsafe-inline'` in prod); the static marketing `/` keeps the hardened pre-nonce baseline. Dev stays permissive (HMR needs it).
- **Consequence:** Data-bearing surfaces get the strongest practical XSS posture without breaking the static landing.

## ADR-009 · The brain is product surface, not just repo docs
- **When:** 2026-07-15 · iteration 7
- **Context:** The goal spec requires an *inspectable* AI brain: anyone can open the knowledge base and verify how decisions were made — provenance per note, backlinks, graph, search — with permissioned read access in-product.
- **Decision:** Ship `/brain` inside the app: it renders this very vault (markdown-first, git-versioned) with resolved wikilinks, backlinks, a link graph, full-text search + TF-IDF related-notes, and a provenance header per note (model/run/confidence/source frontmatter). Access is RBAC-gated (`brain.read`, staff+; viewer is denied — a real, testable permission). Note **content stays English** (source documents); UI chrome is localized.
- **Consequence:** Every brain note needs honest provenance frontmatter (backfilled this iteration). The vault is read from the repo at request time server-side — no CMS, no divergence: what ships is what's committed.

## ADR-010 · EN/FIL: localize the product chrome, not the knowledge base
- **When:** 2026-07-15 · iteration 7
- **Context:** Clinic front-desk staff (the daily users) work in Taglish; buyers read English. Translating strategy documents adds no user value and doubles maintenance.
- **Decision:** Externalize all (app)-surface copy into typed EN + FIL dictionaries with a cookie-persisted locale switcher (EN default). Marketing landing and brain note content remain English in v1.
- **Consequence:** Every new app-surface string must land in the dictionary (no hardcoded copy); e2e asserts both locales render.
