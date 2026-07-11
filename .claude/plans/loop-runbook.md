# Helix Autonomous Loop — Runbook

**Pattern:** continuous / self-paced (Hermes). **Mode:** safe.
**Brand:** Helix (never "HelixOS").
**Source of truth:** the Obsidian brain at `../../brain/00-INDEX.md`.

## Stop condition (explicit)
Halt when all `brain/delivery/vertical-slice-v0.md` acceptance criteria pass
(build+typecheck+lint green, tests ≥80%, e2e happy path, demo seed loads),
OR on 3× repeated hard failure of the same step (escalate), OR on human "stop".

## Iteration protocol
1. Read brain (INDEX + journal tail) + `TaskList`.
2. Pick next unblocked, highest-ROI task.
3. Validate the micro-problem (cheapest correct approach?).
4. Advance in small cohesive files; delegate independent work to parallel subagents.
5. Gate (safe): typecheck + lint + tests for touched code; no secrets; no PHI in logs.
6. Append to `brain/loop/journal.md`; update task status.

## Swarm topology (10 agents, dependency-phased)
- **Substrate** (parallel): db · payers · llm · core · ci-meta
- **Agent** (after substrate): services/agents (eligibility + approval + rules)
- **Surface** (after agent): web · seed+fixtures
- **Verify** (sequential): integration-verifier → security+coverage auditor

## Guardrails (never autonomously)
- No real payer/PHI integration without confirmed rules + human sign-off (mock only).
- No remote push / deploy / external send without explicit human ok.
- No unbounded token burn — task-by-task, checkpoint each, self-paced wakeups.

## Monitor
- Backlog: `TaskList`
- Narrative: `brain/loop/journal.md`
- Diffs: `git log --oneline`
- Swarm: `/workflows`
