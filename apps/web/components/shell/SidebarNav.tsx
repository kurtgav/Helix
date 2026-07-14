"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

export type NavItem = { href: string; label: string; icon: IconName };
export type NavGroup = { label: string; items: NavItem[] };

// The product navigation, grouped by job. Client component only for the active
// state (usePathname) — it still server-renders, so the nav is in the initial
// HTML and never pops in. Labels arrive pre-localized from the server layout.
export function SidebarNav({ groups, ariaLabel }: { groups: NavGroup[]; ariaLabel: string }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="side-nav" aria-label={ariaLabel}>
      {groups.map((group) => (
        <div className="side-nav__group" key={group.label}>
          <span className="side-nav__label" aria-hidden="true">
            {group.label}
          </span>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="side-link"
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
