# 🧬 Helix

**The AI operating layer for healthcare operations.**

Helix does not replace hospital software. It sits on top of the payer + document reality that PH clinics deal with every day and makes each workflow autonomous — while keeping humans in final control.

> Windows didn't replace CPUs. Stripe didn't replace banks. Helix doesn't replace hospital software — it makes every healthcare workflow dramatically more intelligent.

## What we're building first (v0)
The **Eligibility & Pre-Authorization Agent** for Philippine diagnostic centers, labs, and clinics: verify HMO/PhilHealth eligibility, determine LOA/pre-auth requirements, draft the LOA, and flag missing documents **before service is rendered** — killing denied claims and saving staff hours.

Everything is decided in the company brain → open the Obsidian vault at [`brain/`](./brain/00-INDEX.md).

## Principles
- **Integrate, don't replace.** Payers/host systems are pluggable adapters.
- **Retrieve → reason → draft → human-approve → act → audit.** Agents propose; humans dispose.
- **Administrative reasoning only** (v0). No clinical decisions. No hallucinated coverage rules.
- **Secure by default.** RBAC, immutable audit, encryption, RA 10173 (PH Data Privacy Act) + HIPAA-inspired.
- **Synthetic data + mock payer adapters** until real payer rules and data-handling are confirmed.

## Monorepo
```
apps/web            Next.js — intake → verify → LOA → approve → ROI
services/agents     agent runtime: EligibilityAgent + approval engine
packages/shared     domain types, zod schemas, Result/ProposedAction (the contract)
packages/db         Drizzle schema + migrations
packages/payers     payer adapter interface + mock adapters (PhilHealth, Maxicare)
packages/llm        LLMProvider abstraction (Claude primary) + versioned prompts
packages/core       audit, rbac, metrics, events, retrieval
brain/              Obsidian vault — company memory (strategy, architecture, loop)
```

## Develop
```bash
pnpm install
cp .env.example .env      # fill secrets; LLM_PROVIDER=mock and PAYER_MODE=mock for dev
pnpm dev
pnpm test
pnpm typecheck
```

## Status
Pre-alpha. Building the v0 vertical slice — see [`brain/delivery/vertical-slice-v0.md`](./brain/delivery/vertical-slice-v0.md) and the loop runbook at [`brain/loop/runbook.md`](./brain/loop/runbook.md).
