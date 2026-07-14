---
name: journal
type: loop
updated: 2026-07-15
model: claude-fable-5
run: iteration-8
confidence: high
source: append-only iteration log (primary evidence)
---

# Hermes Journal (append-only)

## 2026-07-12 · Iteration 0 — Bootstrap & Validation
- D:/Helix was empty. `git init` (main). Created Obsidian vault `brain/` as company memory.
- **Validated before building.** Verdict ([[problem-validation]]): the generic "AI-layer-on-top-of-existing-HIS" thesis breaks for small PH clinics that have *no* HIS. Corrected wedge = payer friction (PhilHealth eClaims + HMO eligibility/LOA/denials), which is real, daily, and works without an HIS.
- **Wedge chosen** ([[wedge-and-icp]]): Eligibility & Pre-Auth Agent for PH diagnostic centers/labs. Measurable peso recovery (prevented denials) + hours saved. Buyer = owner/admin.
- **Architecture** ([[system-architecture]]): agent-first, retrieve→reason→draft→human-approve→act→audit. Payers as pluggable adapters (mock→real). Administrative reasoning only in v0 (no clinical).
- **Stack** ([[tech-stack]]): TS everywhere, Next.js, Supabase/Postgres+pgvector, Drizzle, Zod, Claude (provider-abstracted), pnpm+turbo. In-process orchestration (no Temporal yet — YAGNI).
- **Backlog** = 10 tasks (#1–#10) toward [[vertical-slice-v0]]. Stop condition defined in [[runbook]].
- Next: scaffold monorepo + data model + payer interface via parallel subagents.

<!-- New iterations append below. Newest last. -->

## 2026-07-15 · Iteration 6 — The Operations OS (10-agent swarm)
Goal: make Helix the best **product OS** to offer — elevate from "one live agent + a seeded ROI form" to a coherent AI **operations OS**, world-class and green. Ran a 10-role swarm across three dependency-phased waves + an adversarial verification wave; I stayed the sole integrator of barrels/routes/seams. Baseline captured green first (typecheck 8/8 · lint 8/8 · 162 tests · build ✓); ended green.

**What shipped (all within guardrails — mock adapters, synthetic data, no real PHI, no autonomous deploy):**
- **Live ROI engine** — closed iteration-5's #1 gap. `@helix/core/roi` (pure `aggregateRoi` + estimate helpers) + `@helix/db/roi` (`computeRoiFromDb`, a thin I/O wrapper over a pure aggregator). Dashboard now computes ROI from **real persisted encounters** when a DB is set, else the seeded baseline, with an honest "Live vs Demo baseline" badge. Verified live: **₱36,000 recovered / 3 denials prevented / 3 checks** read from real Supabase rows, no fallback.
- **Operations Console** (`/console`) — the trust centerpiece: recent activity + the **immutable audit trail made visible** (append-only ledger, actor/action/model+prompt provenance). PHI-minimized readers (`@helix/db/history` — never selects patient name); e2e asserts 0 leaked identifiers.
- **Revenue Cycle Agent — catalog #2, now LIVE (mock)** — Helix's second AI teammate. `services/agents/revenueCycle` (deterministic denial triage → recoverable? → required fixes → cited resubmission draft), RBAC-gated (`revenue.review`/`revenue.resolve`), human-approval `resolve` gate. Surface at `/revenue`. Proves the *workforce*, not a point tool.
- **Agent roster + Executive brief** (`/agents`) — the catalog as a live OS surface; a daily brief derived from live ROI (Executive Agent #8 teaser).
- **Auth + RBAC enforcement + rate limiting** — `@/lib/auth` demo identity substrate running **real** RBAC (viewer blocked end-to-end: route 403 **and** agent `assertCan`), a role switcher in the app bar, in-memory rate limiter (429) on `/api/verify` + `/api/approve`. `requireActor()` now carries the acting role into the agent ctx.
- **CSP nonce** — per-request nonce + `strict-dynamic` on the dynamic app surfaces (drops `'unsafe-inline'` for scripts in prod); the **static** marketing `/` keeps a standard CSP (a build-time page can't carry a per-request nonce; it has no data-bearing actions). Verified: `/verify` etc. carry 14–15 nonced scripts; `/` scripts run under `'unsafe-inline'`.
- **Design elevation** — marketing landing retold as an operating-layer + growing-workforce story with a live-ROI proof section + audit-ledger motif; the Verify flow rebuilt into a trustworthy "decision" surface. Additive tokens only; hero stays CSS-only-reveal (content never gates on JS).
- **e2e + a11y automation** — closed the Playwright/axe follow-up: 7 spec files (health, verify→approve, RBAC 403, console PHI-free, revenue gating, agents links, a11y landmarks/headings). **46 e2e pass** (desktop+mobile), deterministic.
- **Deep research (strategy)** — new brain notes [[product-os-thesis]] + [[competitive-landscape]]: category is real+funded but US/payer-side (Cohere, Anterior, Commure); the PH clinic-side payer-friction seam is unoccupied; the moat is the payer-adapter substrate + the audit log as a decision-trace corpus. Honest risks logged in [[open-questions]].

**Adversarial verification wave** (security-reviewer + react-reviewer + a11y-architect) → I triaged + fixed:
- a11y **BLOCKER**: `required` was stripped before the DOM → no intake field was programmatically required. Fixed in `Field.tsx` (native `required` + `aria-required`; verified 7/7 inputs).
- a11y AA: darkened `--c-warn` (#8a6a1e→#7a5c12, 5.4:1) and `--c-faint` (#8a908b→#686e68, 5.2:1) to pass contrast everywhere; added heading structure to the eligibility decision card + verify form; **skip-to-content** links (app + marketing); `aria-describedby` on the disabled resolve buttons; footer heading-order.
- correctness: `key={encounterId}` to reset the result card per proposal; app-shell `error.tsx` boundary + `getRevenueTriage` try/catch degrade; removed a dead `actionKind` field.
- security hardening: `.max()` caps on all intake free-text (storage/abuse); added `eslint-plugin-react-hooks` (`rules-of-hooks: error`) — CI was blind to hook bugs.
- **CRITICAL (deployment posture, not code):** the public Vercel deploy + live `DATABASE_URL` + the demo cookie-role substrate means an unauthenticated visitor can self-select `owner` and write PII-shaped rows to the real DB. The RBAC substrate itself is correct (enforced both layers); the exposure is *deploying it publicly against a real DB with no auth wall*. Logged as the **#1 pre-GTM blocker** in [[open-questions]] — a human deployment call (password-protect the preview, or point the public demo at a disposable DB, or ship real Supabase Auth behind `getSession()`).

**Verified green:** typecheck 8/8 · lint 8/8 · **264 unit tests** (+102 vs baseline) · **46 e2e** · `next build` ✓ (12 routes; `/` static, app surfaces dynamic; middleware 26.8 kB; first-load JS ~96 kB, under budget) · runtime smoke: all routes 200, nonce on dynamic pages, 0 PHI on console.
**Not pushed / not deployed** (guardrail — awaiting human ok). New agent-catalog status: #1 shipped, **#2 Revenue Cycle live (mock)**. Delivery documented in [[operations-os-v1]].

## 2026-07-12 · Iteration 5 — Live persistence (Supabase) end-to-end
- User provided the Supabase connection string for `bxttjculfzukbpepunoo` (transaction pooler). Treated as a secret — written to a gitignored `.env`, set as an encrypted Vercel env, never committed.
- **Built Postgres persistence** behind the seam (no schema change): `@helix/db` repositories (patient/coverage/encounter/eligibility_check/loa/audit), deterministic payer→uuid mapping, `BufferedAuditLog` (sync `record` → async `flush`), `hasDatabase()`. `client` uses `prepare:false` for the pooler. Seam picks DB vs in-memory by `DATABASE_URL`; human-approval + immutable audit preserved in both. Added `@helix/db` (+ `@helix/core`) deps.
- **Pushed the schema** to Supabase (11 tables + append-only trigger). Verified the DB path locally, then live: the deployed app reports `mode:"persistent"` and writes real rows (2 encounters + 5 audit entries confirmed via SQL).
- Typecheck 8/8, tests green, Vercel build green. Live: **https://helix-eight-silk.vercel.app**.
- **Known follow-ups:** dashboard ROI still shows the seeded demo baseline (real encounters persist but don't yet feed the ROI panel — needs a roi_events feed or a live aggregate query); Playwright/axe automation; auth substrate (still a single demo `staff` actor); CSP nonce hardening.
- Production MVP tasks #11–#18 complete.

## 2026-07-12 · Iteration 4 — Production hardening live; DB blocked on credentials
- **Security headers** (next.config): CSP, HSTS (2y+preload), X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy; `poweredByHeader` off. **`/api/health`** liveness probe (reports mock vs persistent, no secrets). Product polish: dashboard hero tile → unified accent gradient + tabular figures. Set `NEXT_PUBLIC_SITE_URL` env.
- Redeployed: https://helix-eight-silk.vercel.app — verified live: health OK, all security headers present, `x-powered-by` absent.
- **DB push BLOCKED on a credential.** User's Supabase `bxttjculfzukbpepunoo` is in a different org than the MCP-connected PAVI one → MCP denied. No Supabase CLI / access token on this machine. The project URL alone can't authenticate a DB connection. To push + wire I need EITHER the pooled connection URI (with DB password) OR a Supabase account access token. The v0 migration SQL (`packages/db/drizzle/0000_cynical_lyja.sql`, 11 tables + append-only trigger) is ready to apply.
- **Persistence wiring plan (no schema change needed):** persist patient/coverage/encounter/eligibility_check/loa_request/audit_log; map domain payer keys → deterministic v5 UUIDs (avoids a payers-PK change); reconstruct the ProposedAction on approve from eligibility_checks+loa_requests (confidence/rationale not needed); keep mock as the bulletproof default (app stays up when DATABASE_URL is unset). Build + push + activate + test to run as one verified pass once the credential arrives.
- Tasks #11–#14, #17, #18 done. #15 (persistence) + #16 (push) credential-gated.

## 2026-07-12 · Iteration 3 — Unified design system + LIVE on Vercel
- **Unified the design system**: remapped the product's `--c-*` tokens to the landing palette (one system across marketing + product). Shared inline icon sprite (`Sprite`/`Icon`).
- **Production landing at `/`**: ported + upgraded the static landing into a Next route — editorial hero with the live product card, payer strip, metrics, how-it-works, agents, security, FAQ, CTA, footer. Desktop-first, fully responsive; scroll-reveal + reduced-motion safe.
- **Restructured routes**: `/` = landing, product moved under an `(app)` group → `/dashboard` + `/verify` with a unified appbar. Minimal root layout + metadata/OG/SEO + SVG favicon.
- **Deployed LIVE** to Vercel team `kurtgavs-projects` (project `helix`, Root Directory `apps/web`, pnpm monorepo build): **https://helix-eight-silk.vercel.app**. All routes 200, public (no auth wall). Live `/api/verify` returns eligible + LOA-required + gaps + encounterId — full agent pipeline on serverless in mock mode.
- Web production build green (9 routes, `/` 96.6 kB first load). Backend packages still green from v0.
- **Notes / open:** the parallel persistence agent was killed (touched nothing); I'll build DB persistence inline. User's Supabase project `bxttjculfzukbpepunoo` is in a different org than the connected PAVI one → MCP can't reach it; needs its connection string to migrate/seed/wire. My stray `helix-mvp` project never provisioned (no charge).
- Next: DB persistence (inline) + wire Supabase, security headers + `/api/health`, product re-theme polish, responsive QA, redeploy.

## 2026-07-12 · Iteration 2 — Swarm landed + v0 integrated GREEN
- **10-agent swarm `wf_320d57bf-41e` completed** (10/10 done, 0 errors, ~1.28M tokens, ~46 min). Built db, payers, llm, core, ci-meta, services/agents, apps/web, scripts, then integration-verifier + security auditor.
- Swarm self-corrected two real **security defects**: (1) agent-core caught Evidence snippets leaking patient names into the audit trail → `citationsOnly()`; (2) security auditor caught `memberId` being sent to the 3rd-party LLM prompt → dropped + regression test. Both align with [[security-and-compliance]].
- **My finalization pass (config the agents couldn't touch + the real seam):**
  - Added `scripts` to `pnpm-workspace.yaml`, `@helix/agents` to base tsconfig paths, eslint deps to root; removed a stray `rootDir` in `scripts/tsconfig.json` (same TS6059 the verifier fixed elsewhere).
  - **Rewired the web↔agent seam** — it was a fictional `as unknown as AgentsApi` cast that compiled but would throw at runtime (no actor, wrong shapes, no Result). Now: a server-side encounter store (verify parks the proposal, approve retrieves by `encounterId`), real `EligibilityContext`/`ApprovalContext`, a demo `staff` actor + shared audit log, and a mock LLM that echoes the adapter status so mock-mode demos read `eligible`/`ineligible` at 0.9 confidence instead of always `needs_review`.
  - Switched web lint to the flat config; generated Drizzle migrations + added an **append-only trigger** on `audit_log`.
- **Verified for real (not just tests):** `pnpm typecheck` 8/8 · `pnpm test` **162 pass** · `pnpm lint` 8/8 · `next build` ✓ · end-to-end seam smoke ✓ (Juan Dela Cruz / MX-0098-2231 / MRI → eligible, LOA required, 3 doc gaps, approve → LOA **submitted**; inactive member → ineligible; double-approve → blocked).
- **[[vertical-slice-v0]] DoD MET.** Loop stop condition reached for v0.
- Next (new iteration, needs human calls): real user validation of [[open-questions]] before payer integration; auth substrate (task #8); Playwright + axe automation; Revenue Cycle agent (#2 in [[agent-catalog]]).

## 2026-07-12 · Iteration 1 — Landing page (marketing surface)
- Built the Helix landing page at `apps/site/index.html` — static, self-contained (inline CSS/SVG, no webfonts, vanilla-JS progressive enhancement). Kept out of the pnpm/turbo graph (no package.json) so it doesn't collide with the live swarm building `apps/web`.
- Design: light-locked, 1000x-minimal, editorial. Monochrome ink brand on cool off-white; color only as semantic signal (teal-green pass/live, brick red blocking gap). System-sans display + technical mono for records/IDs/audit hashes. No emojis; custom line-icon sprite.
- **Hero = the product thesis:** a live Eligibility & Pre-Auth "proposed action" card (coverage active, LOA drafted, referral missing/blocking) — sells the validated wedge visually. Informative sections: payer strip, 1-click/100%/0-logins metrics, 3-step how-it-works, 6-agent roster, security/trust, CTA.
- Published preview artifact: https://claude.ai/code/artifact/eb1aa453-2668-4253-ad9a-03b636b39ae8
- Swarm `wf_320d57bf-41e` still building the product app in parallel; landing page is disjoint. Awaiting swarm completion to integrate + verify build.

## 2026-07-15 · Iteration 7 — Inspectable brain in-product, EN/FIL, measured latency
Goal (/goal): complete + verified + shippable — close the goal-spec gaps: an inspectable AI brain *in the product*, EN/FIL copy, and the honest-latency follow-up. Worked inline (no swarm); small conventional commits per slice.

- **Brain hygiene first**: fixed the two broken wikilinks by writing [[decisions]] (ADR-001…010 backfilled from this journal) and [[risks-and-kill-criteria]] (K1–K6 tripwires + live risks); backfilled provenance frontmatter (model/run/confidence/source) onto all notes. A unit test now trips CI on any broken wikilink or missing provenance — brain integrity is enforced, not aspirational.
- **`/brain` explorer (ADR-009)** — the vault as product surface: markdown rendered with resolved wikilinks (react-markdown, no raw-HTML path), backlinks + TF-IDF related panel, deterministic server-side force-layout graph (hover neighborhoods, section hues), lazy full-text search over an RBAC-gated corpus API, provenance header per note, git-versioned footer. New core permission `brain.read` (staff+); viewer is denied on the page AND the API (e2e-proved). Vercel serverless reads the vault via outputFileTracingIncludes.
- **EN/FIL (ADR-010)** — typed dictionary (Dict derived from EN; `fil: Dict` makes missing keys a compile error + runtime deep-parity test), cookie locale switcher next to the role switcher, every (app) surface localized incl. executive-brief templates and server-action messages. RSC lesson: dict slices carry template FUNCTIONS and cannot cross the server→client prop boundary — clients receive the serializable `locale` and pick their dictionary client-side. FIL register: professional Taglish (domain terms stay English).
- **Measured latency** — `eligibility_checks.duration_ms` (additive nullable; rollback noted in the SQL). Verify seam times the agent run; computeRoiFromDb maps it onto RoiCheckRow; dashboard avg is measured where measurement exists (legacy nulls keep the documented default). Applied to live Supabase (ALTER … IF NOT EXISTS after drizzle-kit migrate replayed 0000 into the pushed schema — the DB predates migration bookkeeping); live row read back with duration_ms=3.
- **Responsive gate** — new `e2e/responsive.spec.ts`: 8 surfaces × 5 widths, zero horizontal document overflow, permanent. It immediately caught real pre-existing defects: the appbar never wrapped (710px overflow at 375), intake inputs' intrinsic min-width blew the form grid (fix: minmax(0,1fr) + min-width:0), `sr-only` absolutes escaped table scroll boxes (fix: position:relative on scroll containers). Also: mock LOA refs switched to base36 — a 9-digit decimal ref reads like a PhilHealth/member number and tripped the console PHI tripwire (it was flagged via a stale reused e2e server pointing at the live DB; the ref format was still worth fixing at the source).
- **Verified green:** typecheck 8/8 · lint 8/8 · unit suites all packages (106 web incl. i18n parity + vault integrity) · **67 e2e** desktop+mobile · build ✓ 14 routes, worst first-load 123 kB · matrix run: 40 page-loads, zero console errors, zero overflow.
- **Ship:** user gave explicit "push it on live prod" → pushed to origin/main + Vercel production deploy (posture unchanged from the already-public demo; ADR-007 remains the #1 pre-GTM item on [[open-questions]]).

## 2026-07-15 · Iteration 8 — Full-screen product shell + scroll-driven landing
Goal (user, via /goal): redesign the landing full-screen with high-standard scroll animations, and redesign the dashboard system to be professional, organized, and space-efficient (the old 1120px centered column wasted the viewport; the appbar crammed brand+nav+3 switchers into one row).

- **App shell** — replaced the top-bar-over-centered-column chrome with a persistent 264px sidebar (brand, nav grouped Overview/Operations/Intelligence with icons + active rail, org chip + view-site foot) beside a slim sticky workbar carrying the locale + acting-role switchers. Workspace now fills the viewport (fluid padding, soft cap 1840px) — at 1920px the content uses the screen instead of ~58% of it. One `<nav>` only: below 1024px the same DOM collapses to a sticky top rail with horizontal-scroll nav (no duplicated landmarks, no hamburger state to break). `SidebarNav` is the only new client piece (usePathname active state); labels arrive pre-localized from the server layout.
- **Dashboard** — KPI band (peso hero double-width + 4 stat tiles, 6→4→2 columns), then a working split: recent activity reusing the console's PHI-free `EncounterTable` + dict slice (no new projection, no new PHI surface) with an "Open the console" exit, beside a vertical numbered how-it-works rail and the disclaimer. Copy unchanged — every e2e selector (roiAria region, tile labels, New-verification CTA) survives.
- **Landing** — rebuilt as full-bleed editorial: 100svh hero (drifting accent washes, masked grid lines, floating proposed-action card w/ parallax + echo, scroll cue), payer marquee (duplicated list, CSS translate loop, aria-hidden clone), dark proof band (count-up ₱385,200 + stats, spark bars scaleY-in staggered), sticky story deck (3 sticky cards stack + settle via data-active from a center-band IO), 12-col bento workforce, dark hash-chained ledger with row-by-row reveal, full-bleed CTA band, reading-progress hairline. All copy/content kept.
- **ScrollFx engine** (~150 lines, no deps): one IO for reveals (.fx → .is-in, unobserve after), one for the deck's active card, one rAF-throttled scroll loop for nav chrome + progress bar + parallax; [data-stagger] parents get per-child --d delays; [data-count] numbers ease-out count up. **Progressive by construction:** hidden pre-reveal states only exist under [data-armed], which the engine stamps on mount — no JS ships a fully visible page; prefers-reduced-motion skips parallax/counts and the global kill-switch zeroes transitions. Compositor-only (transform/opacity), CSP untouched (static "/" policy unchanged).
- **Housekeeping** — `.link-quiet` promoted to globals.css (app routes referenced it but only marketing.css defined it — latent unstyled-link quirk); dead appbar/topbar/navlinks CSS removed; `IconName` + sprite gain `peso`; new dict keys (nav groups, dashboard activity) added EN+FIL under the compile-enforced parity.
- **Verified green:** typecheck 8/8 · lint 8/8 · unit 8/8 packages (106 web) · **67 e2e** desktop+mobile passed on the first full run and again after polish (incl. the permanent responsive gate: 375–1920 × 8 surfaces, zero overflow) · build ✓ (landing 97.3 kB first-load, worst /verify 124 kB) · eyeballed 12 prod screenshots (1920/1366/375) — count-ups, deck stacking, marquee, sidebar active states all live.
