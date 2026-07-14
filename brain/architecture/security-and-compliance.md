---
name: security-and-compliance
type: architecture
updated: 2026-07-12
model: claude-fable-5
run: iteration-0
confidence: high
source: RA 10173 + HIPAA-inspired checklist; enforced via review gates
---

# Security & Compliance

## Regulatory frame
- **Philippine Data Privacy Act of 2012 (RA 10173)** + **NPC** rules govern patient/coverage data as *sensitive personal information*: lawful basis/consent, purpose limitation, proportionality, security measures, breach notification, data-subject rights.
- **HIPAA-inspired** technical controls (we are not US-regulated in PH, but adopt the discipline): access control, audit, integrity, transmission security.
- Target **SOC 2-ready** architecture from day one (don't retrofit).

## Controls (build into v0 substrate)
- **RBAC + least privilege.** Roles: owner, admin, staff, viewer. Every action authorized against org + role. Row-level isolation per org (Supabase RLS).
- **Immutable audit log.** Append-only. Every agent run + human approval records: actor, action, inputs (references, not raw PHI where avoidable), model + prompt version, retrieved sources, decision, timestamp.
- **Encryption.** TLS in transit; encryption at rest (Supabase/pgcrypto for the most sensitive fields). Documents in encrypted object storage.
- **No PHI in logs / telemetry / prompts sent to 3rd-party LLMs beyond the minimum necessary.** Redact. Prefer field-level minimization. ⚠️ Decide per-payer/LLM what data may leave region — [[open-questions]].
- **Secrets** via env/secret manager; validated at startup; never in repo. Rotate on exposure.
- **Zero-trust** posture: authenticate every request, no implicit network trust.
- **Human-in-the-loop** on all outbound actions (payer submissions, patient messages). Agents propose; humans dispose.
- **No hallucinated critical info.** Coverage/LOA rules come from retrieved payer sources; LLM must cite. If rules aren't retrievable with confidence → flag for human, don't guess.

## Data residency / minimization ⚠️
- Prefer keeping PHI in-region (PH/nearest). Confirm LLM provider data-handling + zero-retention options before sending any real PHI. Until confirmed, **mock/synthetic data only** in dev.

## Threat checklist (recurring review)
- [ ] AuthN/AuthZ on every endpoint + agent action
- [ ] Input validation (Zod) at all boundaries
- [ ] No injection (parameterized/typed queries via Drizzle)
- [ ] No secrets committed (pre-commit scan)
- [ ] Audit covers every state change
- [ ] Rate limiting on public endpoints
- [ ] Error messages leak nothing sensitive

Cross-ref: [[system-architecture]] · [[ph-payer-landscape]].
