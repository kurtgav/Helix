import { describe, it, expect } from "vitest";
import { DICTS, LOCALES, resolveLocale, isLocale, en, fil } from "./index";

describe("resolveLocale (the cookie trust boundary)", () => {
  it("accepts every supported locale unchanged", () => {
    for (const locale of LOCALES) {
      expect(resolveLocale(locale)).toBe(locale);
    }
  });

  it("falls back to EN for absent or unknown values", () => {
    expect(resolveLocale(undefined)).toBe("en");
    expect(resolveLocale("")).toBe("en");
    expect(resolveLocale("tl")).toBe("en");
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("<script>")).toBe("en");
  });

  it("isLocale narrows correctly", () => {
    expect(isLocale("fil")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
});

// Beyond the compile-time Dict contract, prove at runtime that both
// dictionaries expose the same deep key set — a regression net for refactors
// that touch one file and not the other (e.g. via type assertions).
function deepKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      keys.push(...deepKeys(value as Record<string, unknown>, path));
    } else {
      keys.push(`${path}:${typeof value}`);
    }
  }
  return keys.sort();
}

describe("dictionary parity", () => {
  it("EN and FIL expose identical key sets and value kinds", () => {
    expect(deepKeys(fil as unknown as Record<string, unknown>)).toEqual(
      deepKeys(en as unknown as Record<string, unknown>),
    );
  });

  it("every locale has a dictionary", () => {
    for (const locale of LOCALES) {
      expect(DICTS[locale]).toBeDefined();
    }
  });

  it("template functions render with sample values in both locales", () => {
    for (const dict of [en, fil]) {
      expect(dict.dashboard.tilePesosFoot(3)).toContain("3");
      expect(dict.result.blockingGaps(1)).toContain("1");
      expect(dict.revenue.stakes("₱10,000", 2)).toContain("₱10,000");
      expect(dict.agents.rosterTitle(9, 2)).toContain("9");
      expect(dict.brain.searchMatches(0).length).toBeGreaterThan(0);
      expect(dict.console.minutesAgo(5)).toContain("5");
    }
  });
});
