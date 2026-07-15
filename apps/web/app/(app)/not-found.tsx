import Link from "next/link";
import { getDict } from "@/lib/i18n/server";

// In-shell 404 for every (app) route — a mistyped URL or a stale brain
// wikilink lands here with the sidebar intact and routes back into the
// product, instead of Next's bare default outside the app chrome. Server
// component: notFound() renders it within the same request, so getDict()
// reads the real locale cookie (no client cookie-parse needed).
//
// The HTTP status stays a real 404 — /brain/[slug] deliberately ships
// without a loading.tsx because a streaming shell would flush 200 before
// notFound() runs (the brain e2e asserts the status).
export default function AppNotFound() {
  const t = getDict().notFound;

  return (
    <div className="app-error">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="page-title">{t.title}</h1>
      <p className="page-sub">{t.sub}</p>
      <div className="app-error__actions">
        <Link href="/dashboard" className="btn btn--primary">
          {t.backToDashboard}
        </Link>
        <Link href="/brain" className="btn">
          {t.backToBrain}
        </Link>
      </div>
    </div>
  );
}
