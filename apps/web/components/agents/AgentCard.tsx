import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import type { AgentTeammate } from "@/lib/roster";

// One teammate in the roster bento. Three visual variants, one component:
//   • live       → richer, elevated, whole-card <Link>, pulsing "Live" dot
//   • planned    → quieter, muted tile, non-interactive
//   • supervisor → full-width orchestration banner (planned, but distinct)
// Icons map by catalog index; the Supervisor uses the "pulse" (coordination)
// mark. Only existing sprite names are used.

const ICON_BY_N: Readonly<Record<number, IconName>> = {
  1: "shield",
  2: "chart",
  3: "doc",
  4: "hash",
  5: "lock",
  6: "users",
  7: "layers",
  8: "gauge",
};

const OPEN_LABEL: Readonly<Record<string, string>> = {
  "/verify": "Verify",
  "/revenue": "Revenue",
};

function iconFor(agent: AgentTeammate): IconName {
  return agent.n === null ? "pulse" : (ICON_BY_N[agent.n] ?? "layers");
}

export function AgentCard({ agent }: { agent: AgentTeammate }) {
  const isSupervisor = agent.n === null;
  const isLive = agent.status === "live";
  const icon = iconFor(agent);

  // The orchestration layer: a wide banner, visually apart from the grid cells.
  if (isSupervisor) {
    return (
      <li className="agent agent--supervisor">
        <div className="agent__inner sup">
          <span className="agent__icon" aria-hidden="true">
            <Icon name={icon} size={20} />
          </span>
          <div className="sup__text">
            <div className="agent__namerow">
              <h3 className="agent__name">{agent.name}</h3>
              <span className="tag mono">Planned · {agent.phase}</span>
            </div>
            <p className="agent__job">{agent.job}</p>
          </div>
          <span className="sup__viz" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
      </li>
    );
  }

  const index = String(agent.n).padStart(2, "0");
  const content = (
    <>
      <div className="agent__top">
        <span className="agent__icon" aria-hidden="true">
          <Icon name={icon} size={20} />
        </span>
        <span className="agent__index mono">{index}</span>
      </div>
      <div className="agent__body">
        <div className="agent__namerow">
          <h3 className="agent__name">{agent.name}</h3>
          {isLive && (
            <span className="agent__live">
              <i className="live-dot" aria-hidden="true" />
              Live
            </span>
          )}
        </div>
        <p className="agent__job">{agent.job}</p>
      </div>
      <div className="agent__foot">
        {isLive ? (
          <>
            <span className="agent__open">
              Open {agent.href ? (OPEN_LABEL[agent.href] ?? "workspace") : "workspace"}
              <Icon name="arrow" size={15} />
            </span>
            <span className="tag tag--live mono">{agent.phase}</span>
          </>
        ) : (
          <span className="tag mono">Planned · {agent.phase}</span>
        )}
      </div>
    </>
  );

  if (isLive && agent.href) {
    return (
      <li className="agent agent--live">
        <Link href={agent.href} className="agent__link">
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className="agent agent--planned">
      <div className="agent__inner">{content}</div>
    </li>
  );
}
