import { describe, it, expect } from "vitest";
import { z } from "zod";
import { extractJsonCandidate, parseAndValidate } from "./provider";

const personSchema = z.object({ name: z.string(), age: z.number() });

describe("extractJsonCandidate", () => {
  it("returns bare JSON unchanged", () => {
    expect(extractJsonCandidate('{"a":1}')).toBe('{"a":1}');
  });

  it("strips ```json fences", () => {
    const text = '```json\n{"a":1}\n```';
    expect(extractJsonCandidate(text)).toBe('{"a":1}');
  });

  it("extracts the outermost brace span from surrounding prose", () => {
    const text = 'Here you go: {"a":1} — hope that helps.';
    expect(extractJsonCandidate(text)).toBe('{"a":1}');
  });

  it("returns null when there is no object", () => {
    expect(extractJsonCandidate("no json here")).toBeNull();
    expect(extractJsonCandidate("")).toBeNull();
  });
});

describe("parseAndValidate", () => {
  it("returns ok for schema-valid JSON", () => {
    const res = parseAndValidate('{"name":"Juan","age":40}', personSchema);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.name).toBe("Juan");
  });

  it("rejects malformed JSON with llm.invalid_json", () => {
    const res = parseAndValidate("{not valid json", personSchema);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("llm.invalid_json");
  });

  it("rejects text with no JSON object", () => {
    const res = parseAndValidate("sorry, cannot do that", personSchema);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("llm.invalid_json");
  });

  it("rejects schema-violating JSON with llm.schema_validation", () => {
    const res = parseAndValidate('{"name":"Juan","age":"forty"}', personSchema);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("llm.schema_validation");
  });
});
