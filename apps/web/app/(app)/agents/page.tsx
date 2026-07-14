import type { Metadata } from "next";
import { ExecutiveBrief } from "@/components/agents/ExecutiveBrief";
import { RosterGrid } from "@/components/agents/RosterGrid";
import { getExecutiveBrief } from "@/lib/executive";
import { getDict } from "@/lib/i18n/server";
import { ROSTER } from "@/lib/roster";
import "./agents.css";

export const metadata: Metadata = {
  title: "AI Workforce — Helix",
  description:
    "The Helix AI teammate roster and Executive daily brief — an administrative AI workforce for Philippine healthcare operations.",
};

// Server component. The Executive brief reads LIVE ROI (persisted encounters
// when a database is configured, seeded demo baseline otherwise) and degrades
// gracefully; the roster is static catalog data. No client JS. Copy renders in
// the request locale (EN default / FIL).
export default async function AgentsPage() {
  const brief = await getExecutiveBrief();
  const dict = getDict();
  const t = dict.agents;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-sub">{t.sub}</p>
        </div>
      </div>

      <ExecutiveBrief
        lines={brief.lines}
        roi={brief.roi}
        live={brief.live}
        t={t}
        common={dict.common}
      />

      <RosterGrid agents={ROSTER} t={t} />
    </>
  );
}
