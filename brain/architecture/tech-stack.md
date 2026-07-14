---
name: tech-stack
type: architecture
updated: 2026-07-12
model: claude-fable-5
run: iteration-0
confidence: high
source: founding decision (ADR-002 in decisions)
---

# Tech Stack (ADR summary)

Chosen for: fast shipping, type-safety end-to-end, cloud-native, enterprise-ready, agent-native.

| Concern | Choice | Why |
|---|---|---|
| Language | **TypeScript** everywhere feasible | one language across web + agent runtime + shared types; fewer seams |
| Web app | **Next.js (App Router) + React** | fast, SSR, enterprise UI, Vercel-native |
| Agent runtime | **Node/TS service** (Fastify or Next route-handlers to start) | same types as web; keep it one deployable until scale demands split |
| AI pipelines (later) | **Python + FastAPI** | only where Python libs win (OCR, heavy doc ML) — not needed for v0 |
| DB | **Postgres via Supabase** | managed, RLS, auth, storage, `pgvector` built-in |
| Vector / retrieval | **pgvector** (Qdrant later if scale needs) | one datastore for v0; avoid premature infra |
| ORM / access | **Drizzle** (typed SQL) | typed, migration-friendly, no heavy runtime |
| Validation | **Zod** at every boundary | never trust external/LLM/user input |
| LLM | **Claude** primary; provider-abstracted (OpenAI/Gemini/OpenRouter fallback) | quality + a `LLMProvider` interface so we're not locked in |
| Orchestration | start **in-process**; **LangGraph/Temporal** only when workflows demand durability | YAGNI — don't add Temporal to ship one agent |
| Auth | **Supabase Auth** (email/OTP) + RBAC in app | fast, secure default |
| Monorepo | **pnpm + Turborepo** | many small packages, fast CI |
| Deploy | **Vercel** (web) + Supabase; container-ready for later | fastest path; Docker/K8s when enterprise on-prem demands |
| Tests | **Vitest** (unit/integration) + **Playwright** (e2e/a11y) | fast, TS-native |
| Lint/format | ESLint + Prettier | standard |

## Repo shape
```
helix/
  apps/
    web/            # Next.js — intake, verify, LOA approve, ROI
  services/
    agents/         # agent runtime: EligibilityAgent + approval engine
  packages/
    shared/         # zod schemas, domain types, result envelope
    db/             # drizzle schema + migrations + client
    payers/         # payer adapter interface + mock adapters
    llm/            # LLMProvider abstraction + prompts (versioned)
    core/           # audit, rbac, metrics, events, retrieval
  brain/            # THIS Obsidian vault (company memory)
  .claude/plans/    # loop runbook
```

## Rules that override defaults
- **Immutability** in app logic (return new objects) — except DB writes.
- **Many small files** (<800 lines, target 200–400).
- **No secrets in code**; `.env` + `.env.example`; validate required env at startup.
- **No PHI in logs.** Structured logging with redaction.

See [[system-architecture]] · [[security-and-compliance]].
