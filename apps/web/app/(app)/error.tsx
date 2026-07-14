"use client";

import Link from "next/link";
import { DICTS, localeFromCookieString } from "@/lib/i18n";

// App-shell error boundary. Any uncaught error thrown while rendering an (app)
// route lands here instead of a blank crash — the operator gets a calm recovery
// path. We render NO error detail (message/stack could leak internals); Next logs
// it server-side. Nothing was sent to a payer, so the safe action is retry.
//
// Locale: this is a client boundary with fixed props, so it reads the (non-
// httpOnly) locale preference cookie directly and picks the dictionary itself —
// synchronously, no flash of the wrong language.
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale =
    typeof document === "undefined" ? "en" : localeFromCookieString(document.cookie);
  const t = DICTS[locale].errorPage;

  return (
    <div className="app-error" role="alert">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="page-title">{t.title}</h1>
      <p className="page-sub">{t.sub}</p>
      <div className="app-error__actions">
        <button type="button" className="btn btn--primary" onClick={reset}>
          {t.retry}
        </button>
        <Link href="/dashboard" className="btn">
          {t.backToDashboard}
        </Link>
      </div>
    </div>
  );
}
