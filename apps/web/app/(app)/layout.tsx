import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { DEMO_ORG_NAME } from "@/lib/demo";
import { getSession, setRoleAction, DEMO_ROLES } from "@/lib/auth";
import { getDict, getLocale, setLocaleAction } from "@/lib/i18n/server";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n";
import "../pages.css";

// Product chrome: the app bar (brand + primary nav + org context + the demo
// role switcher + the language switcher) over the working surfaces. Shares the
// marketing design system.
//
// The role switcher is a real RBAC control, not decoration: switching to
// "viewer" makes /api/verify and /api/approve return 403 and hides the approve
// affordances — the same enforcement a production identity provider would drive
// (it swaps in behind getSession() without touching callers).
//
// The language switcher mirrors it exactly: one httpOnly cookie (helix_locale),
// validated server-side, EN default, FIL for the front desk (ADR-010).
export default function AppLayout({ children }: { children: ReactNode }) {
  const session = getSession();
  const dict = getDict();
  const locale = getLocale();

  return (
    <>
      <a href="#main" className="skip-link">
        {dict.common.skipToMain}
      </a>
      <header className="appbar appbar--bordered">
        <div className="topbar">
          <Link href="/dashboard" className="brand" aria-label={dict.nav.brandAria}>
            <span className="brand__mark" aria-hidden="true">
              <Icon name="helix" />
            </span>
            Helix
          </Link>
          <nav className="navlinks" aria-label={dict.nav.ariaProduct}>
            <Link href="/dashboard">{dict.nav.dashboard}</Link>
            <Link href="/verify">{dict.nav.verify}</Link>
            <Link href="/console">{dict.nav.console}</Link>
            <Link href="/revenue">{dict.nav.revenue}</Link>
            <Link href="/agents">{dict.nav.agents}</Link>
            <Link href="/brain">{dict.nav.brain}</Link>
          </nav>
          <span className="spacer" />
          <form className="role-switch" aria-label={`${dict.common.language}`}>
            {LOCALES.map((code) => (
              <button
                key={code}
                type="submit"
                formAction={setLocaleAction.bind(null, code)}
                className="role-chip"
                data-active={code === locale ? "true" : undefined}
                aria-pressed={code === locale}
                lang={code === "fil" ? "fil" : "en"}
              >
                {LOCALE_LABELS[code]}
              </button>
            ))}
          </form>
          <form className="role-switch" aria-label={`${dict.common.actingAs} (demo)`}>
            <span className="role-switch__label">{dict.common.actingAs}</span>
            {DEMO_ROLES.map((role) => (
              <button
                key={role}
                type="submit"
                formAction={setRoleAction.bind(null, role)}
                className="role-chip"
                data-active={role === session.role ? "true" : undefined}
                aria-pressed={role === session.role}
              >
                {role}
              </button>
            ))}
          </form>
          <span className="org-chip">
            <Icon name="layers" size={13} />
            {DEMO_ORG_NAME}
          </span>
          <Link href="/" className="link-quiet">
            {dict.common.viewSite}
          </Link>
        </div>
      </header>
      <main id="main" className="shell">
        {children}
      </main>
    </>
  );
}
