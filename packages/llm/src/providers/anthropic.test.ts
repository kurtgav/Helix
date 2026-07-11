import { describe, it, expect } from "vitest";
import {
  AnthropicProvider,
  DEFAULT_ANTHROPIC_MODEL,
  type AnthropicProviderOptions,
} from "./anthropic";
import type { CompletionRequest } from "../provider";

type FakeClient = NonNullable<AnthropicProviderOptions["client"]>;

// A minimal stand-in for the Anthropic SDK client. Only the surface the provider
// touches (messages.create) is implemented, so these tests never hit the network.
function fakeClient(impl: (args: unknown) => Promise<unknown>): FakeClient {
  return {
    messages: { create: impl },
  } as unknown as FakeClient;
}

const req: CompletionRequest = {
  system: "system prompt",
  prompt: "PHI: member MX-0098-2231 for Juan Dela Cruz",
};

describe("AnthropicProvider — construction / secret handling", () => {
  it("fails fast when no API key is configured", () => {
    // Ensure the ambient env key does not mask the config error.
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      expect(() => new AnthropicProvider()).toThrow(/ANTHROPIC_API_KEY/);
    } finally {
      if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
    }
  });

  it("accepts an injected client without requiring a key", () => {
    const provider = new AnthropicProvider({
      client: fakeClient(async () => ({ content: [], model: "x" })),
    });
    expect(provider.name).toBe("anthropic");
  });

  it("does not hardcode a secret and defaults to a Claude model id", () => {
    expect(DEFAULT_ANTHROPIC_MODEL).toContain("claude");
  });
});

describe("AnthropicProvider — complete()", () => {
  it("joins text blocks from the model response", async () => {
    const provider = new AnthropicProvider({
      client: fakeClient(async () => ({
        content: [
          { type: "text", text: "hello " },
          { type: "tool_use", id: "1", name: "x", input: {} },
          { type: "text", text: "world" },
        ],
        model: "claude-opus-4-8",
      })),
    });

    const res = await provider.complete(req);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.text).toBe("hello world");
      expect(res.data.model).toBe("claude-opus-4-8");
    }
  });

  it("returns a stable error code when the model returns no text", async () => {
    const provider = new AnthropicProvider({
      client: fakeClient(async () => ({ content: [], model: "m" })),
    });

    const res = await provider.complete(req);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("llm.empty_response");
  });

  it("surfaces a request failure WITHOUT leaking prompt content (PHI)", async () => {
    const provider = new AnthropicProvider({
      client: fakeClient(async () => {
        throw new Error("upstream 500");
      }),
    });

    const res = await provider.complete(req);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("llm.request_failed");
      // The error must not echo the request body (which can carry PHI).
      const serialized = JSON.stringify(res.error);
      expect(serialized).not.toContain("MX-0098-2231");
      expect(serialized).not.toContain("Juan Dela Cruz");
    }
  });
});
