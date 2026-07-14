import type { Metadata } from "next";
import { ExecutiveBrief } from "@/components/agents/ExecutiveBrief";
import { RosterGrid } from "@/components/agents/RosterGrid";
import { getExecutiveBrief } from "@/lib/executive";
import { ROSTER } from "@/lib/roster";
import "./agents.css";

export const metadata: Metadata = {
  title: "AI Workforce — Helix",
  description:
    "The Helix AI teammate roster and Executive daily brief — an administrative AI workforce for Philippine healthcare operations.",
};

// Server component. The Executive brief reads LIVE ROI (persisted encounters
// when a database is configured, seeded demo baseline otherwise) and degrades
// gracefully; the roster is static catalog data. No client JS.
export default async function AgentsPage() {
  const brief = await getExecutiveBrief();

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">AI Workforce</p>
          <h1 className="page-title">Your AI workforce, on the clock.</h1>
          <p className="page-sub">
            Nine teammates on one substrate — tools, retrieval, and a human-approval gate.
            Two are live today; the rest ship in order, each earned by the ROI of the last.
          </p>
        </div>
      </div>

      <ExecutiveBrief lines={brief.lines} roi={brief.roi} live={brief.live} />

      <RosterGrid agents={ROSTER} />
    </>
  );
}
