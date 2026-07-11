import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { DEMO_ORG_NAME } from "@/lib/demo";
import "./globals.css";
import "../components/components.css";
import "./pages.css";

export const metadata: Metadata = {
  title: "Helix — Eligibility & Pre-Auth",
  description:
    "Helix verifies coverage, drafts LOAs, and flags missing docs — with a human in final control.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand" aria-label="Helix home">
            <span className="brand__mark" aria-hidden="true">
              H
            </span>
            Helix
          </Link>
          <span className="org-chip">{DEMO_ORG_NAME}</span>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
