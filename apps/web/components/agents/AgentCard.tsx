import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import type { AgentTeammate } from "@/lib/roster";
import type { Dict } from "@/lib/i18n";

// One teammate in the roster bento. Three visual variants, one component:
//   • live       → richer, elevated, whole-card <Link>, pulsing "Live" dot
//   • planned    → quieter, muted tile, non-interactive
//   • supervisor → full-width orchestration banner (planned, but distinct)
// Icons map by catalog index; the Supervisor uses the "pulse" (coordination)
// mark. Only existing sprite names are used.
//
// Copy: teammate NAMES and phase tags are product/release identifiers and stay
// as data; the job descriptions localize through the dict (jobFor).

type AgentsDict = Dict["agents"];

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

function iconFor(agent: AgentTeammate): IconName {
  return agent.n === null ? "pulse" : (ICON_BY_N[agent.n] ?? "layers");
}

function jobFor(t: AgentsDict, agent: AgentTeammate): string {
  switch (agent.n) {
    case 1:
      return t.job1;
    case 2:
      return t.job2;
    case 3:
      return t.job3;
    case 4:
      return t.job4;
    case 5:
      return t.job5;
    case 6:
      return t.job6;
    case 7:
      return t.job7;
    case 8:
      return t.job8;
    default:
      return t.jobSupervisor;
  }
}

/** Localized label for the surface a live teammate opens. */
function openSurface(t: AgentsDict, href: string | undefined): string {
  if (href === "/verify") return t.openIn("Verify");
  if (href === "/revenue") return t.openIn("Revenue");
  return t.openIn("workspace");
}

export function AgentCard({ agent, t }: { agent: AgentTeammate; t: AgentsDict }) {
  const isSupervisor = agent.n === null;
  const isLive = agent.status === "live";
  const icon = iconFor(agent);
  const job = jobFor(t, agent);

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
              <span className="tag mono">{t.plannedTag(agent.phase)}</span>
            </div>
            <p className="agent__job">{job}</p>
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
              {t.legendLive}
            </span>
          )}
        </div>
        <p className="agent__job">{job}</p>
      </div>
      <div className="agent__foot">
        {isLive ? (
          <>
            <span className="agent__open">
              {openSurface(t, agent.href)}
              <Icon name="arrow" size={15} />
            </span>
            <span className="tag tag--live mono">{agent.phase}</span>
          </>
        ) : (
          <span className="tag mono">{t.plannedTag(agent.phase)}</span>
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
