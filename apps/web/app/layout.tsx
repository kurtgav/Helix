import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Sprite } from "@/components/Sprite";
import "./globals.css";
import "../components/components.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Helix — The AI operating layer for healthcare operations",
    template: "%s · Helix",
  },
  description:
    "Helix gives every healthcare workflow an autonomous teammate — verifying eligibility, clearing pre-authorizations, and catching denials before they cost you. Humans keep final control.",
  applicationName: "Helix",
  authors: [{ name: "Helix" }],
  keywords: [
    "healthcare AI",
    "eligibility verification",
    "pre-authorization",
    "revenue cycle",
    "PhilHealth",
    "HMO",
    "Philippines",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    siteName: "Helix",
    type: "website",
    locale: "en_PH",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfcfb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sprite />
        {children}
      </body>
    </html>
  );
}
