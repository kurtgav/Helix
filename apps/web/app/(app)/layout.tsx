import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { SidebarNav, type NavGroup } from "@/components/shell/SidebarNav";
import { DEMO_ORG_NAME } from "@/lib/demo";
import { getSession, setRoleAction, DEMO_ROLES } from "@/lib/auth";
import { getDict, getLocale, setLocaleAction } from "@/lib/i18n/server";
import { LOCALES, LOCALE_LABELS } from "@/lib/i18n";
import "../app-shell.css";
import "../pages.css";

// Product chrome: a persistent sidebar (brand + grouped primary nav + org
// context) beside a slim workbar (locale + acting-role switchers) over a
// full-width workspace. Below 1024px the sidebar becomes a sticky top rail with
// a horizontally scrollable nav — same DOM, one <nav>, CSS-only collapse.
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

  const groups: NavGroup[] = [
    {
      label: dict.nav.groupOverview,
      items: [{ href: "/dashboard", label: dict.nav.dashboard, icon: "gauge" }],
    },
    {
      label: dict.nav.groupOperate,
      items: [
        { href: "/verify", label: dict.nav.verify, icon: "shield" },
        { href: "/console", label: dict.nav.console, icon: "clipboard" },
        { href: "/revenue", label: dict.nav.revenue, icon: "peso" },
        { href: "/ledger", label: dict.nav.ledger, icon: "scale" },
      ],
    },
    {
      label: dict.nav.groupIntelligence,
      items: [
        { href: "/agents", label: dict.nav.agents, icon: "users" },
        { href: "/brain", label: dict.nav.brain, icon: "spark" },
      ],
    },
  ];

  return (
    <>
      <a href="#main" className="skip-link">
        {dict.common.skipToMain}
      </a>
      <div className="app-frame">
        <aside className="side">
          <div className="side__brand">
            <Link href="/dashboard" className="brand" aria-label={dict.nav.brandAria}>
              <span className="brand__mark" aria-hidden="true">
                <Icon name="helix" />
              </span>
              Helix
            </Link>
          </div>
          <SidebarNav groups={groups} ariaLabel={dict.nav.ariaProduct} />
          <div className="side__foot">
            <span className="org-chip">
              <Icon name="layers" size={13} />
              {DEMO_ORG_NAME}
            </span>
            <Link href="/" className="link-quiet side__site">
              {dict.common.viewSite}
              <Icon name="arrow" size={14} />
            </Link>
          </div>
        </aside>

        <div className="frame-main">
          <header className="workbar">
            <span className="workbar__context">
              <span className="workbar__dot" aria-hidden="true" />
              {DEMO_ORG_NAME}
            </span>
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
          </header>
          <main id="main" className="workspace">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
