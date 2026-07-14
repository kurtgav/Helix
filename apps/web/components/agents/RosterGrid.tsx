import type { AgentTeammate } from "@/lib/roster";
import type { Dict } from "@/lib/i18n";
import { AgentCard } from "./AgentCard";

// The roster as an editorial bento, not a uniform grid. Cards set their own
// span via variant classes in agents.css: live teammates run wide and rich,
// planned tiles are quieter, and the Supervisor spans the full width as an
// orchestration banner. Rendered in catalog order so the composition reads
// live-first, then the planned pipeline, then the coordination layer.
export function RosterGrid({
  agents,
  t,
}: {
  agents: readonly AgentTeammate[];
  t: Dict["agents"];
}) {
  const liveCount = agents.filter((a) => a.status === "live").length;

  return (
    <section className="roster-section" aria-labelledby="roster-heading">
      <header className="roster-head">
        <div>
          <p className="eyebrow">{t.rosterEyebrow}</p>
          <h2 id="roster-heading" className="roster-title">
            {t.rosterTitle(agents.length, liveCount)}
          </h2>
          <p className="roster-lead">{t.rosterLead}</p>
        </div>
        <ul className="roster-legend" aria-hidden="true">
          <li>
            <i className="live-dot" />
            {t.legendLive}
          </li>
          <li>
            <i className="planned-dot" />
            {t.legendPlanned}
          </li>
        </ul>
      </header>

      <ul className="roster">
        {agents.map((agent) => (
          <AgentCard key={agent.name} agent={agent} t={t} />
        ))}
      </ul>
    </section>
  );
}
