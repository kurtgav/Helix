---
name: system-architecture
type: architecture
updated: 2026-07-12
---

# System Architecture — the AI OS shape

## Principle
Helix is **agent-first, API-first, event-driven, integrate-not-replace**. Every autonomous action is: **retrieve → reason → draft → human-approve → act → audit.** Humans hold final approval on anything that leaves the building (submissions to payers, patient-facing messages).

## Layers (bottom → top)

```
┌───────────────────────────────────────────────────────────────┐
│  Surfaces:  Next.js web app  ·  (later) mobile, embeds, API     │
├───────────────────────────────────────────────────────────────┤
│  Agent layer:  independent AI teammates (Eligibility, RCM,      │
│  Coding, Compliance, Docs, Reception, Executive…) + Supervisor  │
│  orchestration.  Each agent = tools + rules + LLM + approval.   │
├───────────────────────────────────────────────────────────────┤
│  Core services:  approval/workflow engine · audit · RBAC ·      │
│  retrieval (pgvector) · document pipeline · ROI metrics · events│
├───────────────────────────────────────────────────────────────┤
│  Integration layer:  pluggable connectors                       │
│    · Payers (PhilHealth, Maxicare, … via adapter interface)     │
│    · Host systems (HIS/EMR/EHR/billing) — optional, where exist │
├───────────────────────────────────────────────────────────────┤
│  Data:  Postgres (Supabase) + pgvector · object store · events  │
└───────────────────────────────────────────────────────────────┘
```

## Key design decisions
- **Agent = capability, not a chatbot.** Each agent exposes typed tasks (e.g. `verifyEligibility`, `draftLOA`), calls tools/adapters, and returns a **proposed action + evidence**, never a silent side effect on the outside world.
- **Human-approval gate** is a first-class primitive in the [[system-architecture|approval engine]], not per-agent glue. Config: which action types are auto vs. require approval, per org/role.
- **Retrieval before generation.** Payer rules, SOPs, org policy live in a knowledge store; the LLM reasons over retrieved facts, cites them, and must not invent coverage rules. (See [[security-and-compliance]] on no-hallucination for critical data.)
- **Everything audited.** Append-only `audit_log`: who/what/when, agent inputs, model + prompt version, retrieved sources, human decision. Non-repudiation + Data Privacy Act evidence.
- **Adapters via repository pattern.** Payer/host connectors implement one interface; business logic depends on the interface, not the payer. Mock adapters ship first (fixtures) so the full flow is buildable + testable without live payer access. See [[ph-payer-landscape]].
- **Event-driven.** Agent runs, approvals, status changes emit events → power ROI metrics, the Executive Agent, and future multi-agent coordination.
- **Separation of reasoning.** Administrative reasoning (coverage, LOA, coding-assist) is isolated from any clinical reasoning. v0 is **administrative only** — no clinical decisions.

## v0 concrete flow (Eligibility & Pre-Auth) — [[vertical-slice-v0]]
```
intake(patient, coverage, service)
  → EligibilityAgent.run()
      → payerAdapter.checkEligibility()          (mock→real)
      → ruleEngine.getRequirements(service,plan) (retrieved payer rules)
      → llm.draftLOA(context, retrieved rules)   (cited, no invented rules)
      → gaps = detectMissingDocs()
  → returns ProposedAction{ eligibility, loaDraft, gaps, evidence }
  → UI shows result → staff approves/edits
  → on approve: payerAdapter.submitLOA() (or mark ready) + audit + metrics
```

## Non-goals (v0)
- Not the system of record. Not an EHR. Not autonomous clinical advice. Not multi-agent orchestration yet (Supervisor is Phase 2). Keep it simple — ship the wedge. See [[wedge-and-icp]].
