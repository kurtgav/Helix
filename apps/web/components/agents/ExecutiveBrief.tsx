import { Icon } from "@/components/Icon";
import { formatPesos, formatHours } from "@/lib/format";
import type { ExecutiveBriefData } from "@/lib/executive";

// The hero: an editorial "daily brief" panel on the accent gradient. The
// Executive Agent (catalog #8) teaser — natural-language summary written from
// aggregate ROI only (no PHI). A live/demo tag states the data source, and a
// stat rail shows the three headline numbers in tabular mono.
export function ExecutiveBrief({ lines, roi, live }: ExecutiveBriefData) {
  return (
    <section className="exec" aria-labelledby="exec-heading">
      <Icon name="gauge" className="exec__ghost" />

      <div className="exec__main">
        <div className="exec__eyebrow">
          <span className="exec__badge" aria-hidden="true">
            <Icon name="gauge" size={15} />
          </span>
          <span className="eyebrow exec__kicker">Executive Agent · Daily brief</span>
          <span className={`exec__tag${live ? "" : " exec__tag--demo"}`}>
            <i className="exec__tag-dot" aria-hidden="true" />
            {live ? "Live" : "Demo"}
          </span>
        </div>

        <h2 id="exec-heading" className="sr-only">
          Executive daily brief
        </h2>

        <div className="exec__lines">
          {lines.map((line, i) => {
            const cls =
              i === 0 ? "exec__lead" : i === lines.length - 1 ? "exec__note" : "exec__line";
            return (
              <p key={i} className={cls}>
                {line}
              </p>
            );
          })}
        </div>

        <p className="exec__disclaimer">Written from aggregate ROI only — no patient details.</p>
      </div>

      <dl className="exec__stats">
        <div className="exec-stat">
          <dt>Checks run</dt>
          <dd>{roi.checksRun}</dd>
        </div>
        <div className="exec-stat">
          <dt>Recovered</dt>
          <dd>{formatPesos(roi.pesosRecovered)}</dd>
        </div>
        <div className="exec-stat">
          <dt>Hours saved</dt>
          <dd>{formatHours(roi.hoursSaved)}</dd>
        </div>
      </dl>
    </section>
  );
}
