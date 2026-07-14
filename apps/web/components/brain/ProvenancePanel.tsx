import { Icon } from "@/components/Icon";
import type { BrainNoteMeta } from "@/lib/brain/types";

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

export function ProvenancePanel({ note }: { note: BrainNoteMeta }) {
  const { provenance } = note;
  return (
    <section className="prov" aria-label="Provenance">
      <h2 className="prov__title">
        <Icon name="fingerprint" size={14} />
        Provenance
      </h2>
      <dl className="prov__grid">
        <div className="prov__row">
          <dt>Model</dt>
          <dd className="prov__mono">{provenance.model ?? "—"}</dd>
        </div>
        <div className="prov__row">
          <dt>Run</dt>
          <dd className="prov__mono">{provenance.run ?? "—"}</dd>
        </div>
        <div className="prov__row">
          <dt>Confidence</dt>
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
          <dt>Updated</dt>
          <dd className="prov__mono">{note.updated ?? "—"}</dd>
        </div>
        <div className="prov__row prov__row--wide">
          <dt>Source</dt>
          <dd>{provenance.source ? plainFrontmatter(provenance.source) : "—"}</dd>
        </div>
        {note.status ? (
          <div className="prov__row prov__row--wide">
            <dt>Status</dt>
            <dd>{note.status}</dd>
          </div>
        ) : null}
      </dl>
      <p className="prov__foot">
        <Icon name="lock" size={12} />
        Version-controlled — every revision of this note is in git history.
      </p>
    </section>
  );
}
