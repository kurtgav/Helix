import type { LLMProvider } from "./provider";
import { MockProvider } from "./providers/mock";
import { AnthropicProvider } from "./providers/anthropic";

// Select a provider from the environment. Defaults to the deterministic mock so
// dev/test/CI never require a secret or network access.
//
//   LLM_PROVIDER=mock       (default) → MockProvider
//   LLM_PROVIDER=anthropic           → AnthropicProvider (needs ANTHROPIC_API_KEY)
export function getLLM(
  env: Record<string, string | undefined> = process.env,
): LLMProvider {
  const provider = (env.LLM_PROVIDER ?? "mock").toLowerCase();

  switch (provider) {
    case "mock":
      return new MockProvider();
    case "anthropic":
      return new AnthropicProvider({
        apiKey: env.ANTHROPIC_API_KEY,
        model: env.ANTHROPIC_MODEL,
      });
    default:
      throw new Error(
        `Unknown LLM_PROVIDER "${provider}". Expected "mock" or "anthropic".`,
      );
  }
}
