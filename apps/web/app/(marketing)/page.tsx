import type { Metadata } from "next";
import { Landing } from "./Landing";
import "./marketing.css";

export const metadata: Metadata = {
  title: "Helix — The AI operating layer for healthcare operations",
  description:
    "Helix gives every healthcare workflow an autonomous teammate — verifying insurance eligibility, clearing pre-authorizations, and catching denials before they cost you. Built for PhilHealth and Philippine HMOs. Humans keep final control.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Helix — The AI operating layer for healthcare operations",
    description:
      "Autonomous teammates for healthcare operations. Verify eligibility, clear pre-authorizations, and catch denials before they cost you. Humans in final control.",
    type: "website",
  },
};

export default function MarketingHome() {
  return <Landing />;
}
