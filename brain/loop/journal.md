---
name: journal
type: loop
updated: 2026-07-12
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

## 2026-07-12 · Iteration 1 — Landing page (marketing surface)
- Built the Helix landing page at `apps/site/index.html` — static, self-contained (inline CSS/SVG, no webfonts, vanilla-JS progressive enhancement). Kept out of the pnpm/turbo graph (no package.json) so it doesn't collide with the live swarm building `apps/web`.
- Design: light-locked, 1000x-minimal, editorial. Monochrome ink brand on cool off-white; color only as semantic signal (teal-green pass/live, brick red blocking gap). System-sans display + technical mono for records/IDs/audit hashes. No emojis; custom line-icon sprite.
- **Hero = the product thesis:** a live Eligibility & Pre-Auth "proposed action" card (coverage active, LOA drafted, referral missing/blocking) — sells the validated wedge visually. Informative sections: payer strip, 1-click/100%/0-logins metrics, 3-step how-it-works, 6-agent roster, security/trust, CTA.
- Published preview artifact: https://claude.ai/code/artifact/eb1aa453-2668-4253-ad9a-03b636b39ae8
- Swarm `wf_320d57bf-41e` still building the product app in parallel; landing page is disjoint. Awaiting swarm completion to integrate + verify build.
