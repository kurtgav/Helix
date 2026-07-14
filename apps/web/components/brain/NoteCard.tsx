import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { BrainNoteMeta } from "@/lib/brain/types";

// One note in the explorer listing: title, type + confidence, excerpt, and its
// place in the link graph (backlink/outbound counts). The whole card is a link.

export function NoteCard({ note }: { note: BrainNoteMeta }) {
  return (
    <Link href={`/brain/${note.slug}`} className="note-card" data-section={note.section}>
      <span className="note-card__top">
        <span className="note-card__type">{note.type}</span>
        {note.provenance.confidence ? (
          <span className="note-card__conf" data-confidence={note.provenance.confidence}>
            {note.provenance.confidence}
          </span>
        ) : null}
      </span>
      <span className="note-card__title">{note.title}</span>
      {note.excerpt ? <span className="note-card__excerpt">{note.excerpt}</span> : null}
      <span className="note-card__meta">
        <span className="note-card__stat">
          <Icon name="link" size={12} />
          {note.backlinks.length} in · {note.outbound.length} out
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
