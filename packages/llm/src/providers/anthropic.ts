import Anthropic from "@anthropic-ai/sdk";
import type { Result } from "@helix/shared";
import { ok, err } from "@helix/shared";
import type { CompletionRequest, CompletionText } from "../provider";
import { BaseLLMProvider } from "../provider";

// Thin Claude adapter. Constructed lazily (only when LLM_PROVIDER=anthropic) so
// tests that use the mock never touch the network or require an API key.

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-8";
const DEFAULT_MAX_TOKENS = 4096;

export interface AnthropicProviderOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  // Injectable client for testing without network access.
  client?: Anthropic;
}

export class AnthropicProvider extends BaseLLMProvider {
  readonly name = "anthropic";
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly maxTokens: number;

  constructor(options: AnthropicProviderOptions = {}) {
    super();
    this.model = options.model ?? DEFAULT_ANTHROPIC_MODEL;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;

    if (options.client) {
      this.client = options.client;
      return;
    }
    const apiKey = options.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Fail fast at construction — a missing secret is a config error, not a
      // per-request condition.
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Set it or use LLM_PROVIDER=mock.",
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  async complete(req: CompletionRequest): Promise<Result<CompletionText>> {
    try {
      const message = await this.client.messages.create({
        model: req.model ?? this.model,
        max_tokens: req.maxTokens ?? this.maxTokens,
        system: req.system,
        messages: [{ role: "user", content: req.prompt }],
      });

      const text = message.content
        .filter(
          (block): block is Anthropic.TextBlock => block.type === "text",
        )
        .map((block) => block.text)
        .join("");

      if (text.length === 0) {
        return err({
          code: "llm.empty_response",
          message: "Model returned no text content.",
        });
      }
      return ok({ text, model: message.model });
    } catch (error) {
      // Do NOT log request content — it may contain PHI. Surface a stable code
      // and a non-sensitive message only.
      return err({
        code: "llm.request_failed",
        message:
          error instanceof Error
            ? error.message
            : "Anthropic request failed.",
      });
    }
  }
}
