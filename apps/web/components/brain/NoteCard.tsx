import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { BrainNoteMeta } from "@/lib/brain/types";
import type { Dict } from "@/lib/i18n";

// One note in the explorer listing: title, type + confidence, excerpt, and its
// place in the link graph (backlink/outbound counts). The whole card is a link.

/** Known tiers get a localized label; anything else shows the raw frontmatter
 *  value (honest, if unstyled — CSS only tones high/medium/low). */
function confidenceLabel(confidence: string, t: Dict["brain"]): string {
  const labels: Record<string, string> = {
    high: t.confHigh,
    medium: t.confMedium,
    low: t.confLow,
  };
  return labels[confidence.toLowerCase()] ?? confidence;
}

export function NoteCard({ note, t }: { note: BrainNoteMeta; t: Dict["brain"] }) {
  // Frontmatter is hand-written YAML — "High" must tone like "high".
  const confidence = note.provenance.confidence?.toLowerCase();
  return (
    <Link href={`/brain/${note.slug}`} className="note-card" data-section={note.section}>
      <span className="note-card__top">
        <span className="note-card__type">{note.type}</span>
        {note.provenance.confidence ? (
          <span className="note-card__conf" data-confidence={confidence}>
            {confidenceLabel(note.provenance.confidence, t)}
          </span>
        ) : null}
      </span>
      <span className="note-card__title">{note.title}</span>
      {note.excerpt ? <span className="note-card__excerpt">{note.excerpt}</span> : null}
      <span className="note-card__meta">
        <span className="note-card__stat">
          <Icon name="link" size={12} />
          {t.cardLinks(note.backlinks.length, note.outbound.length)}
        </span>
        {note.updated ? (
          <time className="note-card__date" dateTime={note.updated}>
            {note.updated}
          </time>
        ) : null}
      </span>
    </Link>
  );
}
