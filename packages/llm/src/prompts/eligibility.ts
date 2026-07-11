import type { CompletionRequest } from "../provider";

// Versioned eligibility prompt. Bump PROMPT_VERSION on any wording change so
// audit trails (AuditEntry.promptVersion) stay meaningful and reproducible.
export const PROMPT_VERSION = "eligibility-v1";

// A single retrieved rule/requirement, already fetched from fixtures or the
// payer adapter. The model MUST cite these as Evidence — it may not invent
// payer rules from prior knowledge.
export interface RetrievedRequirement {
  label: string;
  source: string; // e.g. "payer:maxicare/rules"
  ref: string; // stable id / section
  snippet?: string;
}

export interface EligibilityPromptInput {
  payer: { name: string; kind: string };
  coverage: { planName: string; memberId?: string; status: string };
  service: { code: string; name: string; category: string };
  retrievedRequirements: RetrievedRequirement[];
}

const SYSTEM = `You are Helix, an administrative assistant for Philippine healthcare operations (HMOs like Maxicare, Intellicare, Medicard, and PhilHealth).

Your job is ADMINISTRATIVE ONLY. You reason about coverage paperwork, member IDs, referrals, and letters of authorization. You NEVER make clinical judgments about whether a service is medically appropriate.

Hard rules:
- Use ONLY the retrieved requirements provided in the request. Do NOT invent payer rules from memory.
- Every requirement and gap you output MUST be backed by an entry in "evidence" that cites one of the provided sources (source + ref).
- If the retrieved information is missing, ambiguous, or insufficient to decide, choose status "needs_review". Do NOT guess "eligible" or "ineligible".
- Respond with a SINGLE JSON object and nothing else. No prose, no code fences.`;

// Serialize retrieved rules into a stable, model-readable block.
function formatRequirements(reqs: RetrievedRequirement[]): string {
  if (reqs.length === 0) {
    return "(none retrieved — you have no payer rules to rely on)";
  }
  return reqs
    .map((r, i) => {
      const snippet = r.snippet ? `\n   snippet: ${r.snippet}` : "";
      return `${i + 1}. ${r.label}\n   source: ${r.source}\n   ref: ${r.ref}${snippet}`;
    })
    .join("\n");
}

// Build the user turn describing the eligibility question and the required
// output shape (an EligibilityResult).
export function buildEligibilityPrompt(input: EligibilityPromptInput): string {
  return `Determine administrative eligibility for the following service request.

PAYER: ${input.payer.name} (${input.payer.kind})
COVERAGE: plan="${input.coverage.planName}", status=${input.coverage.status}${
    input.coverage.memberId ? `, memberId=${input.coverage.memberId}` : ""
  }
SERVICE: ${input.service.code} — ${input.service.name} (${input.service.category})

RETRIEVED REQUIREMENTS:
${formatRequirements(input.retrievedRequirements)}

Emit a JSON object with exactly this shape:
{
  "status": "eligible" | "ineligible" | "needs_review",
  "benefit": string (optional short description of the covered benefit),
  "requirements": [
    { "type": "loa" | "referral" | "valid_id" | "member_id" | "doctor_request" | "consult_first" | "other",
      "label": string, "required": boolean, "present": boolean, "note": string (optional) }
  ],
  "gaps": [ { "kind": string, "message": string, "blocking": boolean } ],
  "evidence": [ { "source": string, "ref": string, "snippet": string (optional) } ],
  "checkedAt": string (ISO 8601 timestamp)
}

Remember: cite evidence for every claim, and prefer "needs_review" over guessing.`;
}

// Convenience: assemble a full CompletionRequest for a provider.
export function eligibilityRequest(
  input: EligibilityPromptInput,
  overrides: Partial<CompletionRequest> = {},
): CompletionRequest {
  return {
    system: SYSTEM,
    prompt: buildEligibilityPrompt(input),
    ...overrides,
  };
}

export const ELIGIBILITY_SYSTEM_PROMPT = SYSTEM;
