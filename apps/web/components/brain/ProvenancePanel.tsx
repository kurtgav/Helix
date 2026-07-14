import { Icon } from "@/components/Icon";
import type { BrainNoteMeta } from "@/lib/brain/types";
import type { Dict } from "@/lib/i18n";

// The trust header of every note: where the claim came from, which model/run
// produced it, and how much to trust it. Absent fields render as an em dash —
// showing "unknown" honestly beats inventing provenance.

const CONFIDENCE_CLASS: Record<string, string> = {
  high: "prov-chip--high",
  medium: "prov-chip--medium",
  low: "prov-chip--low",
};

function confidenceClass(confidence?: string): string {
  if (!confidence) return "";
  const key = confidence.toLowerCase().split(/[^a-z]/)[0] ?? "";
  return CONFIDENCE_CLASS[key] ?? "";
}

/** Frontmatter strings may carry [[wikilink]] syntax; show the target text —
 *  the panel is a metadata readout, not a markdown surface. */
function plainFrontmatter(value: string): string {
  return value.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target: string, alias?: string) =>
    (alias ?? target).trim(),
  );
}

export function ProvenancePanel({ note, t }: { note: BrainNoteMeta; t: Dict["brain"] }) {
  const { provenance } = note;
  return (
    <section className="prov" aria-label={t.provAria}>
      <h2 className="prov__title">
        <Icon name="fingerprint" size={14} />
        {t.provTitle}
      </h2>
      <dl className="prov__grid">
        <div className="prov__row">
          <dt>{t.provModel}</dt>
          <dd className="prov__mono">{provenance.model ?? "—"}</dd>
        </div>
        <div className="prov__row">
          <dt>{t.provRun}</dt>
          <dd className="prov__mono">{provenance.run ?? "—"}</dd>
        </div>
        <div className="prov__row">
          <dt>{t.provConfidence}</dt>
          <dd>
            {provenance.confidence ? (
              <span className={`prov-chip ${confidenceClass(provenance.confidence)}`}>
                {provenance.confidence}
              </span>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div className="prov__row">
          <dt>{t.provUpdated}</dt>
          <dd className="prov__mono">{note.updated ?? "—"}</dd>
        </div>
        <div className="prov__row prov__row--wide">
          <dt>{t.provSource}</dt>
          <dd>{provenance.source ? plainFrontmatter(provenance.source) : "—"}</dd>
        </div>
        {note.status ? (
          <div className="prov__row prov__row--wide">
            <dt>{t.provStatus}</dt>
            <dd>{note.status}</dd>
          </div>
        ) : null}
      </dl>
      <p className="prov__foot">
        <Icon name="lock" size={12} />
        {t.provFoot}
      </p>
    </section>
  );
}
