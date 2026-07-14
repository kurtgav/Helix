---
name: risks-and-kill-criteria
type: strategy
updated: 2026-07-15
status: draft — thresholds need founder sign-off
model: claude-fable-5
run: iteration-7
confidence: medium
source: synthesized from [[problem-validation]], [[competitive-landscape]], [[product-os-thesis]], [[open-questions]]
---

# Risks & Kill Criteria

> What would make us stop, pivot, or slow down — written **before** we're emotionally invested. Each risk has a tripwire we can actually observe. Companion to [[open-questions]] (the unknowns) — this file is what we *do* when an unknown resolves badly.

## Kill criteria (stop or hard-pivot signals)

| # | Tripwire | Verdict if hit |
|---|----------|----------------|
| K1 | **10+ discovery interviews** with ICP clinics ([[wedge-and-icp]]) and fewer than 3 rank eligibility/LOA/denials a top-3 operational pain | Wedge is wrong → re-validate ([[problem-validation]]) before writing more product code |
| K2 | **No payer path:** neither PhilHealth nor any top-5 HMO offers a repeatable verification/LOA channel an adapter can drive (API, portal, or stable assisted flow) | The adapter substrate isn't software → pivot to document/denial-side tooling or stop |
| K3 | **ROI fails vs cheap labor:** measured peso value (denials prevented + hours saved) < ~2× the cost of the admin clerk time it replaces, at pilot clinics | Business model unviable at wedge price point ([[business-model]]) → reprice or pivot segment |
| K4 | **Willingness-to-pay zero:** 2 pilot clinics use it, see the ROI number, and still won't pay anything | Nice-to-have, not a product → stop before scaling GTM |
| K5 | **Compliance wall:** NPC/RA 10173 or payer data-sharing terms make clinic-side automation legally impractical without enterprise-grade contracts we can't get | Regulatory moat is against us → partner (EMR/BPO) or stop |
| K6 | **Occupied seam:** a local incumbent (EMR like SeriousMD, HMO in-house tool, or BPO product) already ships clinic-side eligibility/LOA automation with real adoption | First-mover claim dead ([[competitive-landscape]]) → differentiate on trust substrate or exit the wedge |

## Live risks (tracked, not yet tripwires)

- **R1 · Integration mode uncertainty** — adapters may be RPA/human-assisted rather than APIs for years. Mitigation: adapter interface stays channel-agnostic (mock → portal-driver → API), measured per payer in [[ph-payer-landscape]].
- **R2 · Model-provider disintermediation** — frontier models make LOA drafting trivial. Mitigation: defensibility lives in payer adapters + the audit decision-trace corpus + clinic trust, not prompt quality ([[product-os-thesis]]).
- **R3 · Demo-posture exposure** — the public demo's cookie-role substrate against a live DB (ADR-007 in [[decisions]]). Mitigation: no wider sharing until the deployment call is made; it is the #1 item in [[open-questions]].
- **R4 · Solo-loop key-person risk** — the loop builds fast but context lives here. Mitigation: this vault (now inspectable in-product) is the memory; every decision logged in [[decisions]] + [[journal]].
- **R5 · "OS" framing backfires** — buyers hear platform bloat, not focus. Mitigation: sell the wedge (denials prevented, in pesos); the OS story is for expansion, not the first check.

## Review cadence
Revisit at every GTM milestone (first 5 interviews, first pilot, first paid pilot). Any K-tripwire hit → log the evidence in [[journal]], decide in [[decisions]], and update this file — before more build work.
