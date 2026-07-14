import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { DEMO_ORG_NAME } from "@/lib/demo";
import { getSession, setRoleAction, DEMO_ROLES } from "@/lib/auth";
import "../pages.css";

// Product chrome: the app bar (brand + primary nav + org context + the demo
// role switcher) over the working surfaces (/dashboard, /verify, /console,
// /revenue, /agents). Shares the marketing design system.
//
// The role switcher is a real RBAC control, not decoration: switching to
// "viewer" makes /api/verify and /api/approve return 403 and hides the approve
// affordances — the same enforcement a production identity provider would drive
// (it swaps in behind getSession() without touching callers).
export default function AppLayout({ children }: { children: ReactNode }) {
  const session = getSession();

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header className="appbar appbar--bordered">
        <div className="topbar">
          <Link href="/dashboard" className="brand" aria-label="Helix dashboard">
            <span className="brand__mark" aria-hidden="true">
              <Icon name="helix" />
            </span>
            Helix
          </Link>
          <nav className="navlinks" aria-label="Product">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/verify">Verify</Link>
            <Link href="/console">Console</Link>
            <Link href="/revenue">Revenue</Link>
            <Link href="/agents">Agents</Link>
            <Link href="/brain">Brain</Link>
          </nav>
          <span className="spacer" />
          <form className="role-switch" aria-label="Acting role (demo)">
            <span className="role-switch__label">Acting as</span>
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
            View site
          </Link>
        </div>
      </header>
      <main id="main" className="shell">
        {children}
      </main>
    </>
  );
}
