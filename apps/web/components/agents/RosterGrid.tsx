import type { AgentTeammate } from "@/lib/roster";
import { AgentCard } from "./AgentCard";

// The roster as an editorial bento, not a uniform grid. Cards set their own
// span via variant classes in agents.css: live teammates run wide and rich,
// planned tiles are quieter, and the Supervisor spans the full width as an
// orchestration banner. Rendered in catalog order so the composition reads
// live-first, then the planned pipeline, then the coordination layer.
export function RosterGrid({ agents }: { agents: readonly AgentTeammate[] }) {
  const liveCount = agents.filter((a) => a.status === "live").length;

  return (
    <section className="roster-section" aria-labelledby="roster-heading">
      <header className="roster-head">
        <div>
          <p className="eyebrow">The Roster</p>
          <h2 id="roster-heading" className="roster-title">
            {agents.length} teammates. {liveCount} on the clock.
          </h2>
          <p className="roster-lead">
            Every teammate is a proposed action behind a human-approval gate — nothing
            reaches a payer until you approve it.
          </p>
        </div>
        <ul className="roster-legend" aria-hidden="true">
          <li>
            <i className="live-dot" />
            Live
          </li>
          <li>
            <i className="planned-dot" />
            Planned
          </li>
        </ul>
      </header>

      <ul className="roster">
        {agents.map((agent) => (
          <AgentCard key={agent.name} agent={agent} />
        ))}
      </ul>
    </section>
  );
}
