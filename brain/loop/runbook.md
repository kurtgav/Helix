---
name: runbook
type: loop
updated: 2026-07-12
mode: safe
pattern: continuous (self-paced, Hermes)
model: claude-fable-5
run: iteration-0
confidence: high
source: loop constitution
---

# Loop Runbook

## Mission
Act as Hermes: keep moving, never stall. Read [[00-INDEX|the brain]] each iteration, pick the next highest-value task from the backlog, advance it, validate, log, repeat — until [[vertical-slice-v0]] is DONE.

## Stop condition (explicit)
Loop halts when **all [[vertical-slice-v0]] acceptance criteria pass** (build+typecheck+lint green, tests ≥80%, e2e happy path green, demo seed loads). Then: summarize, tag `v0`, surface must-validate-with-users list, await human GTM validation before Phase 2. Also halts on: repeated hard failure of the same step 3× (escalate in [[journal]]), or explicit "stop".

## Iteration protocol
1. **Read brain** — INDEX + journal tail + open tasks (`TaskList`).
2. **Pick** the next unblocked, highest-ROI task.
3. **Validate** the micro-problem (does this task still make sense? cheapest correct approach?).
4. **Advance** — implement in small, cohesive files; delegate independent work to parallel subagents.
5. **Gate (safe mode):** typecheck + lint + relevant tests must pass for touched code before marking done. No secrets. No PHI in logs.
6. **Log** to [[journal]] (append-only): what changed, decisions, new open questions.
7. **Mark** task status; add follow-ups. Loop.

## Quality gates (safe mode)
- Build + typecheck + lint clean on touched packages.
- Tests for new logic; overall target ≥80%.
- Security checklist ([[security-and-compliance]]) for any auth/data/adapter/endpoint change.
- Every agent action → audit + human-approval gate.

## Model/effort strategy
- Cheap mechanical work (scaffold, fixtures, mocks, docs) → lower tier / parallel workers.
- Hard reasoning (schema design, agent core, security, rule engine) → top tier.
- Adversarial verify on security + agent correctness before "done".

## Guardrails (what the loop must NOT do autonomously)
- No real payer/PHI integration without confirmed rules + human sign-off.
- No pushing to remotes, deploying, or external sends without explicit human ok.
- No unbounded token burn: work task-by-task, checkpoint each, self-pace via scheduled wake-ups.

## Monitor
`TaskList` for backlog · [[journal]] for narrative · git log for diffs.
