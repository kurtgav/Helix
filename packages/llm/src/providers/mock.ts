import type { Result } from "@helix/shared";
import { ok } from "@helix/shared";
import type { CompletionRequest, CompletionText } from "../provider";
import { BaseLLMProvider } from "../provider";

// Deterministic, offline provider for tests and local dev (LLM_PROVIDER=mock).
// It performs NO network I/O and returns stable, schema-valid canned output.
// The default response is an EligibilityResult-shaped object with status
// needs_review — the safe administrative default when nothing is retrieved.

// Fixed clock so default output is byte-stable across runs.
export const MOCK_TIMESTAMP = "2025-01-01T00:00:00.000Z";
export const MOCK_MODEL = "mock-1";

export interface MockProviderOptions {
  // Override the raw text returned by complete() (and thus parsed by
  // completeJSON). Use this to exercise malformed-output paths.
  respondText?: (req: CompletionRequest) => string;
  // Override the object returned by completeJSON. It is JSON-stringified and
  // then run through the same parse+validate path as a real provider.
  respondJson?: (req: CompletionRequest) => unknown;
  now?: () => string;
}

// A safe, schema-valid default shaped like an EligibilityResult. Kept as a
// plain object (not imported type) so the mock stays domain-light; the caller's
// zod schema is what actually validates it.
function defaultEligibilityJson(now: string): unknown {
  return {
    status: "needs_review",
    requirements: [
      {
        type: "member_id",
        label: "Valid HMO/PhilHealth member ID",
        required: true,
        present: false,
      },
    ],
    gaps: [
      {
        kind: "data",
        message:
          "Deterministic mock output — not a real eligibility determination.",
        blocking: false,
      },
    ],
    evidence: [{ source: "mock:deterministic", ref: "mock-provider" }],
    checkedAt: now,
  };
}

export class MockProvider extends BaseLLMProvider {
  readonly name = "mock";

  constructor(private readonly options: MockProviderOptions = {}) {
    super();
  }

  private now(): string {
    return this.options.now?.() ?? MOCK_TIMESTAMP;
  }

  async complete(req: CompletionRequest): Promise<Result<CompletionText>> {
    if (this.options.respondText) {
      return ok({ text: this.options.respondText(req), model: MOCK_MODEL });
    }
    const payload = this.options.respondJson
      ? this.options.respondJson(req)
      : defaultEligibilityJson(this.now());
    return ok({ text: JSON.stringify(payload), model: MOCK_MODEL });
  }
}
