---
name: agent-catalog
type: architecture
updated: 2026-07-12
---

# Agent Catalog (build order)

Each agent shares the same substrate: tools/adapters + retrieval + LLM + **human-approval gate** + audit ([[system-architecture]]). Ship them one at a time; earn each with ROI from the last.

| # | Agent | Job | Phase | Status |
|---|---|---|---|---|
| 1 | **Eligibility & Pre-Auth** | verify coverage, determine LOA needs, draft LOA, flag missing docs | v0 | ✅ shipped [[vertical-slice-v0]] |
| 2 | **Revenue Cycle** | administrative denial triage: classify denial, decide recoverability, list fixes, draft resubmission | v1 | ✅ live (mock) — [[operations-os-v1]], surface `/revenue` |
| 3 | **Documentation** | ingest PDFs/referrals/IDs/discharge notes → structured data + retrieval | next (feeds #1) | ⏳ |
| 4 | **Coding assist** | ICD/CPT/case-rate suggestions + claim validation (human confirms) | later | ⏳ |
| 5 | **Compliance** | Q&A over SOPs, accreditation manuals, DPA/NPC rules, internal policy | later | ⏳ |
| 6 | **Reception** | appointments, reminders, intake, FAQs | later | ⏳ |
| 7 | **Knowledge** | org-scoped assistant over all hospital knowledge | later | ⏳ |
| 8 | **Executive** | daily ops/risk/revenue summary + recommendations (not dashboards) | later | ⏳ |
| — | **Supervisor** | coordinates agents; multi-agent workflows | Phase 2 | ⏳ |

## Why this order
- #1 is the wedge (measurable peso recovery, works without an HIS) — [[wedge-and-icp]].
- #3 (Documentation) is a dependency multiplier: better doc extraction makes #1 and #2 sharper. Build the minimal slice of it inside #1, promote to standalone when reused.
- #8 (Executive) is the retention/expansion hook once enough events exist to summarize.

## Agent contract (all agents)
```ts
interface Agent<Input, Proposal> {
  name: string
  run(input: Input, ctx: OrgContext): Promise<ProposedAction<Proposal>>
}
// ProposedAction = { proposal, evidence[], confidence, requiresApproval, audit }
// Nothing leaves the building without an approved ProposedAction.
```
