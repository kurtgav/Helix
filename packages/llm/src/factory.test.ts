import { describe, it, expect } from "vitest";
import { getLLM } from "./factory";
import { MockProvider } from "./providers/mock";
import { AnthropicProvider } from "./providers/anthropic";

describe("getLLM", () => {
  it("defaults to the mock provider", () => {
    expect(getLLM({})).toBeInstanceOf(MockProvider);
  });

  it("returns the mock provider for LLM_PROVIDER=mock", () => {
    expect(getLLM({ LLM_PROVIDER: "mock" })).toBeInstanceOf(MockProvider);
  });

  it("returns the anthropic provider when a key is present", () => {
    const llm = getLLM({
      LLM_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "sk-test-not-real",
    });
    expect(llm).toBeInstanceOf(AnthropicProvider);
  });

  it("throws when anthropic is selected without a key", () => {
    expect(() => getLLM({ LLM_PROVIDER: "anthropic" })).toThrow(
      /ANTHROPIC_API_KEY/,
    );
  });

  it("throws on an unknown provider", () => {
    expect(() => getLLM({ LLM_PROVIDER: "openai" })).toThrow(/Unknown/);
  });
});
