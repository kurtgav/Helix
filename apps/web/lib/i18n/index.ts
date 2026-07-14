// Public i18n surface. Pure — safe to import from client AND server modules.
// (Client components should normally receive dict slices as props from server
// components; importing a dictionary directly is fine for defaults/tests.)

export {
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_LABELS,
  isLocale,
  resolveLocale,
  localeFromCookieString,
} from "./locales";
export type { Locale } from "./locales";
export { en } from "./en";
export type { Dict } from "./en";
export { fil } from "./fil";

import { en } from "./en";
import { fil } from "./fil";
import type { Locale } from "./locales";
import type { Dict } from "./en";

export const DICTS: Readonly<Record<Locale, Dict>> = { en, fil };
