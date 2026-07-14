import "server-only";

// Server half of i18n: read the locale cookie, hand out the dictionary, and
// the Server Action behind the appbar language switcher. Mirrors the identity
// substrate (lib/auth.ts) exactly: one httpOnly cookie, runtime validation at
// the boundary, revalidate the whole shell on change.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DICTS } from "./index";
import { LOCALE_COOKIE, isLocale, resolveLocale, type Locale } from "./locales";
import type { Dict } from "./en";

/** The request's locale — EN unless a valid FIL cookie is present. */
export function getLocale(): Locale {
  return resolveLocale(cookies().get(LOCALE_COOKIE)?.value);
}

/** The request's dictionary. Server components pass slices down as props. */
export function getDict(): Dict {
  return DICTS[getLocale()];
}

/**
 * Server action for the language switcher. A server action is a public
 * endpoint — `locale` is untrusted regardless of its TypeScript type, so it is
 * re-validated against the Locale union before it can reach the cookie.
 */
export async function setLocaleAction(locale: Locale): Promise<void> {
  "use server";

  if (!isLocale(locale)) {
    throw new Error("Unknown locale.");
  }

  // Deliberately NOT httpOnly (unlike the role cookie): the locale is a plain
  // UI preference with no authority — client error boundaries read it to pick
  // a dictionary without a server round-trip, and the server re-validates the
  // raw value through resolveLocale on every request anyway.
  cookies().set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/", "layout");
}
