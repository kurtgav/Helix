# PROGRESS

> Slice-by-slice status with evidence. The narrative lives in the brain:
> [`brain/loop/journal.md`](./brain/loop/journal.md) · decisions in
> [`brain/loop/decisions.md`](./brain/loop/decisions.md) — both readable
> in-product at `/brain` (staff+).

## Iteration 8 — full-screen product shell + scroll-driven landing (2026-07-15)

| Slice | Status | Evidence |
|---|---|---|
| A — App shell redesign: persistent sidebar (grouped nav: Overview / Operations / Intelligence, icons, active states) + slim workbar (locale + acting-role switchers) + full-width workspace (soft cap 1840px). One `<nav>`; collapses to a sticky top rail <1024px via CSS only | ✅ | happy-path nav spec + a11y (one h1/one main/labeled controls) green on desktop+mobile |
| B — Dashboard reorganized: 6-col KPI band (peso hero ×2), recent-activity panel (reuses the console's PHI-free projection + `EncounterTable`), vertical how-it-works rail, console exit link | ✅ | ROI region/CTA selectors unchanged; console PHI spec still green |
| C — Landing rebuilt full-screen: 100svh hero (drifting washes, grid mask, floating decision card, scroll cue), payer marquee, dark proof band with count-ups + growing spark bars, sticky story deck (3 cards), bento workforce, dark ledger with staggered rows, full-bleed CTA, reading-progress hairline | ✅ | `ScrollFx` = IO reveals + parallax + counts in one rAF loop; no-JS ships fully visible (`data-armed` gate); reduced-motion safe |
| D — i18n parity kept: new nav-group + dashboard-activity strings in EN and FIL (compile-enforced) | ✅ | 6 i18n e2e green incl. FIL persistence |

**Gates (all green):** typecheck 8/8 · lint 8/8 · unit 8/8 packages (106 web) · **67 e2e** (incl. permanent responsive gate: zero horizontal overflow 375–1920 × 8 surfaces) · `next build` ✓ (landing 97.3 kB first-load, worst route /verify 124 kB).

**Notes:** `.link-quiet` moved to globals (app routes never actually loaded its marketing-only definition); obsolete appbar/topbar CSS removed; `IconName` gains `peso`.

## Iteration 7 — inspectable brain, EN/FIL, measured latency (2026-07-15)

| Slice | Status | Evidence |
|---|---|---|
| Brain hygiene — ADR log + `risks-and-kill-criteria`, provenance frontmatter on all 18 notes | ✅ | vault integrity unit test: 0 broken wikilinks, 100% model/run coverage |
| A — `/brain` explorer: wikilinks, backlinks, TF-IDF related, server-laid-out graph, full-text search, provenance header, RBAC (`brain.read`, staff+) | ✅ | +37 unit tests · 7 e2e specs (viewer denied on page AND API) · zero console errors |
| B — EN/FIL localization: typed dicts (FIL compile-enforced parity), cookie switcher, all (app) surfaces | ✅ | 6 i18n e2e (switch persistence, FIL verify→decision, garbage-cookie fallback) · FIL screenshots |
| C — measured verify latency: `eligibility_checks.duration_ms` (additive, reversible), live avg on dashboard | ✅ | migration applied to Supabase; live row `duration_ms=3` read back |
| D — verification sweep: responsive matrix 375/768/1280/1440/1920 × 8 surfaces | ✅ | `e2e/responsive.spec.ts` permanent gate: zero horizontal overflow, zero console errors |

**Gates (all green):** typecheck 8/8 · lint 8/8 · unit tests 8 packages (core/db/payers/llm/shared/agents/scripts/web, 106 web) · **67 e2e** (desktop+mobile incl. responsive gate) · `next build` ✓ (14 routes; worst first-load 123 kB).

**Fixed along the way (pre-existing):** appbar never wrapped (710px overflow at 375), form inputs' intrinsic min-width blew the intake grid, `sr-only` spans escaped table scroll containers, mock payer LOA refs looked like 9-digit member IDs (now base36), duplicate `<h1>` on brain notes.

## How to run
```bash
pnpm install
pnpm dev                        # DATABASE_URL unset → deterministic in-memory mode
pnpm typecheck && pnpm lint && pnpm test
cd apps/web && pnpm exec playwright test   # builds + serves prod, 67 specs
```

## What remains (tracked in brain/loop/open-questions.md)
- **Deployment posture** (ADR-007): the public demo runs a cookie-selectable role against the live DB — password-protect, disposable DB, or real Supabase Auth before wide sharing. *Human call; the code seam is ready (`getSession()`).*
- Real payer adapters — gated on confirmed payer rules (mock-only by design, ADR-004).
- Rate limiter is per-instance in-memory; move to a shared store before it's a real control.
- Multi-tenant hardening (orgId predicates + RLS) before a second org exists.
- Marketing landing + brain note content stay EN in v1 (ADR-010).
