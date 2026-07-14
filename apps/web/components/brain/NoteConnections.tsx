import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { BrainNote } from "@/lib/brain/types";
import type { Dict } from "@/lib/i18n";

// Bidirectional context for a note: which notes cite this one (backlinks —
// the inverted index Obsidian users live in) and which notes are topically
// close (TF-IDF over the vault corpus). Server component.

interface Props {
  note: BrainNote;
  titleOf: (slug: string) => string;
  t: Dict["brain"];
}

function ConnectionList({
  slugs,
  titleOf,
  emptyText,
}: {
  slugs: readonly string[];
  titleOf: (slug: string) => string;
  emptyText: string;
}) {
  if (slugs.length === 0) {
    return <p className="conn__empty">{emptyText}</p>;
  }
  return (
    <ul className="conn__list">
      {slugs.map((slug) => (
        <li key={slug}>
          <Link href={`/brain/${slug}`} className="conn__link">
            <Icon name="doc" size={13} />
            <span>{titleOf(slug)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function NoteConnections({ note, titleOf, t }: Props) {
  return (
    <section className="conn" aria-label={t.connAria}>
      <div className="conn__group">
        <h2 className="conn__title">
          <Icon name="link" size={13} />
          {t.connLinkedFrom}
          <span className="conn__count">{note.backlinks.length}</span>
        </h2>
        <ConnectionList
          slugs={note.backlinks}
          titleOf={titleOf}
          emptyText={t.connEmptyBacklinks}
        />
      </div>
      <div className="conn__group">
        <h2 className="conn__title">
          <Icon name="arrow" size={13} />
          {t.connLinksTo}
          <span className="conn__count">{note.outbound.length}</span>
        </h2>
        <ConnectionList
          slugs={note.outbound}
          titleOf={titleOf}
          emptyText={t.connEmptyOutbound}
        />
      </div>
      <div className="conn__group">
        <h2 className="conn__title">
          <Icon name="spark" size={13} />
          {t.connRelated}
        </h2>
        <ConnectionList slugs={note.related} titleOf={titleOf} emptyText={t.connEmptyRelated} />
      </div>
    </section>
  );
}
