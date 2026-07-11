export type {
  CompletionRequest,
  CompletionText,
  LLMProvider,
} from "./provider";
export {
  BaseLLMProvider,
  parseAndValidate,
  extractJsonCandidate,
} from "./provider";

export { MockProvider, MOCK_TIMESTAMP, MOCK_MODEL } from "./providers/mock";
export type { MockProviderOptions } from "./providers/mock";

export {
  AnthropicProvider,
  DEFAULT_ANTHROPIC_MODEL,
} from "./providers/anthropic";
export type { AnthropicProviderOptions } from "./providers/anthropic";

export {
  PROMPT_VERSION,
  buildEligibilityPrompt,
  eligibilityRequest,
  ELIGIBILITY_SYSTEM_PROMPT,
} from "./prompts/eligibility";
export type {
  EligibilityPromptInput,
  RetrievedRequirement,
} from "./prompts/eligibility";

export { getLLM } from "./factory";
