import type { ZodType } from "zod";
import type { Result } from "@helix/shared";
import { ok, err } from "@helix/shared";

// Provider-abstracted LLM access. Every call returns a Result — no thrown
// control flow crosses this boundary. Raw model output is NEVER trusted:
// completeJSON parses and zod-validates before returning typed data.

export interface CompletionRequest {
  // System prompt (persona / instructions). Kept separate from the user turn
  // so it can be cached and versioned independently.
  system?: string;
  // The user turn — typically a versioned template with retrieved context.
  prompt: string;
  // Hard cap on output tokens. Small for administrative JSON; defaults applied
  // per-provider. (Sampling params like temperature are intentionally absent —
  // current Claude models reject them.)
  maxTokens?: number;
  // Optional per-request model override; providers supply a default.
  model?: string;
}

export interface CompletionText {
  text: string;
  model?: string;
}

export interface LLMProvider {
  readonly name: string;
  complete(req: CompletionRequest): Promise<Result<CompletionText>>;
  completeJSON<T>(
    req: CompletionRequest,
    schema: ZodType<T>,
  ): Promise<Result<T>>;
}

// Pull a JSON object out of model text. Models sometimes wrap JSON in ```json
// fences or add prose around it — strip fences, then fall back to the outermost
// brace span. Returns the candidate string, or null if none is found.
export function extractJsonCandidate(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  // Strip a fenced block if present (```json ... ``` or ``` ... ```).
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenceMatch?.[1] ?? trimmed).trim();

  // If the body already parses as-is, use it.
  if (body.startsWith("{") && body.endsWith("}")) return body;

  // Otherwise take the outermost {...} span.
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return body.slice(first, last + 1);
}

// Parse raw model text into a validated T. Two failure modes, both surfaced as
// AppError rather than exceptions: malformed JSON, or JSON that violates the
// schema. Never returns unvalidated data.
export function parseAndValidate<T>(
  text: string,
  schema: ZodType<T>,
): Result<T> {
  const candidate = extractJsonCandidate(text);
  if (candidate === null) {
    return err({
      code: "llm.invalid_json",
      message: "Model output did not contain a JSON object.",
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return err({
      code: "llm.invalid_json",
      message: "Model output was not valid JSON.",
    });
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return err({
      code: "llm.schema_validation",
      message: "Model output did not match the expected schema.",
      details: result.error.issues,
    });
  }
  return ok(result.data);
}

// Shared base: subclasses implement complete(); completeJSON is derived so the
// parse+validate path is identical across providers.
export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly name: string;
  abstract complete(req: CompletionRequest): Promise<Result<CompletionText>>;

  async completeJSON<T>(
    req: CompletionRequest,
    schema: ZodType<T>,
  ): Promise<Result<T>> {
    const res = await this.complete(req);
    if (!res.ok) return res;
    return parseAndValidate(res.data.text, schema);
  }
}
