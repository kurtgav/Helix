---
name: decisions
type: loop
updated: 2026-07-15
model: claude-fable-5
run: iteration-9
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

## ADR-011 · PH payer rulebook as a cited knowledge module + deterministic policy engine
- **When:** 2026-07-15 · iteration 9
- **Context:** The product asserted eligibility without knowing the actual PH clocks: when a claim must be filed, how long a denial stays contestable, what group-vs-individual policy terms (waiting periods, PEC, MBL) do to a walk-in. Three primary-source research passes settled the facts — and corrected folklore (PhilHealth MR = **15 days**, not 60; "LOA valid 30 days" is Maxicare-specific; PhilCare's is 3) — see [[ph-denial-and-eligibility-rules]].
- **Decision:** Encode the researched rules as `@helix/payers` **knowledge**: every rule carries authority, document ref, confidence (`verified`/`reported`/`assumed`) and a `verifyBeforeLive` flag; contractual HMO windows ship as conservative operating defaults. On top: a **pure policy engine** (`services/agents/src/policy/engine.ts`) that turns a member's retrieved `PolicyProfile` (new adapter capability, fixture-driven) into cited `PolicyCheck`s — coverage window, waiting period, PEC (flag-only: the condition question is clinical and stays human), benefit limit, filing window — with one-way status escalation (fail ⇒ ineligible, attention ⇒ needs_review; never downgrades). The Revenue Cycle agent's age gates now derive from the same rulebook (payer-kind-aware appeal/refile windows) and every finding carries a `DeadlineAssessment`.
- **Consequence:** Both agents now cite the regulation or contract term behind every time-window claim, and the UI shows the clock (policy checks on /verify, recovery-window column on /revenue). `assumed`/`reported` rules remain hard-gated from live use (ADR-004 unchanged); replacing a default with a clinic's real contract term is a fixture/knowledge edit, not a code change.

## ADR-012 · Receivables Agent: the payer's own clock becomes product surface
- **When:** 2026-07-15 · iteration 10
- **Context:** The product watched every clinic-side deadline (filing, MR, RTH — ADR-011) but no payer-side one. Research validated the gap as the sharpest unmet clinic pain in PH (₱59.6B PhilHealth backlog; documented 18-month HMO payment delays) and confirmed **no PH/SEA clinic-side product ships payer payment-behavior analytics, cited follow-ups, or claims-pipeline cash forecasting** — while the regulatory hooks (IRR of RA 7875 §47 + G.R. 214485; IC CL 2024-01 unfair-claims practice; CAMS windows) sit unused. Full analysis + sources: [[receivables-and-scale]].
- **Decision:** Ship teammate #3, the **Receivables Agent**, on the ADR-011 pattern: (a) rulebook gains `payer_payment` rules — PhilHealth 60-day action window (**verified**: IRR §47, recognized in PHIC v. Urdaneta Sacred Heart Hospital) and an HMO contractual default (45 days per AHMOPI-template terms, `reported`, `verifyBeforeLive`); (b) a pure ledger engine (`services/agents/src/receivables/`) assesses each submitted claim's standing against its payer's window, measures per-payer behavior (median days-to-pay, on-time rate, shortfall rate, denial rate → A–D grade; overdue money caps the grade at B), and projects collections from observed behavior with rulebook fallback; (c) overdue money gets a cited **status follow-up draft — never a demand** (the cited windows except claims under investigation), gated behind the same `revenue.resolve` human approval; (d) new `/ledger` surface (scorecards, forecast, claim table, draft + resolve), EN/FIL, synthetic fixture ledger (ADR-004 posture unchanged — no DB writes, no PHI).
- **Consequence:** Helix now works both sides of the payer clock: what the clinic owes the process, and what the process owes the clinic. RBAC reuses `revenue.review`/`revenue.resolve` (receivables ARE revenue work — no matrix growth). The ledger is the moat-compounder: measured payer behavior feeds forecasting now and cross-clinic payer benchmarking at multi-tenant scale. The HMO payment default is contract-specific and stays hard-gated from live use.
