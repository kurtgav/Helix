// Locale primitives — PURE (no framework imports) so they unit-test directly.
// EN is the default; FIL is professional Taglish: UI verbs and structure in
// Filipino, payer/domain terms (LOA, eligibility, claims) in English, exactly
// how PH clinic front desks actually talk (ADR-010 in brain/loop/decisions).

export const LOCALES = ["en", "fil"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie carrying the chosen locale. Not httpOnly: it is a harmless UI
 *  preference that client error boundaries also read; the server re-validates
 *  it via resolveLocale on every request. */
export const LOCALE_COOKIE = "helix_locale";

/** Client-side locale read (document.cookie). Pure given a cookie string, so
 *  it stays unit-testable; callers pass document.cookie. */
export function localeFromCookieString(cookieString: string): Locale {
  const match = cookieString
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`));
  return resolveLocale(match?.slice(LOCALE_COOKIE.length + 1));
}

/** Human labels for the switcher chips. */
export const LOCALE_LABELS: Readonly<Record<Locale, string>> = {
  en: "EN",
  fil: "FIL",
};

/** Type guard: is this arbitrary string a supported Locale? */
export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * Validate a raw cookie value against the Locale union. Absent or unrecognized
 * → the EN default. The unit-tested trust boundary between the untrusted cookie
 * string and the dictionaries (mirrors resolveRole in lib/auth.ts).
 */
export function resolveLocale(raw: string | undefined): Locale {
  return raw !== undefined && isLocale(raw) ? raw : DEFAULT_LOCALE;
}
