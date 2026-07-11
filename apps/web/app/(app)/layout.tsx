import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { DEMO_ORG_NAME } from "@/lib/demo";
import "../pages.css";

// Product chrome: the app bar (brand + primary nav + org context) over the
// working surfaces (/dashboard, /verify). Shares the marketing design system.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
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
          </nav>
          <span className="spacer" />
          <span className="org-chip">
            <Icon name="layers" size={13} />
            {DEMO_ORG_NAME}
          </span>
          <Link href="/" className="link-quiet">
            View site
          </Link>
        </div>
      </header>
      <main className="shell">{children}</main>
    </>
  );
}
