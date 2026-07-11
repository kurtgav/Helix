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
