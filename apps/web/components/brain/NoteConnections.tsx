import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { BrainNote } from "@/lib/brain/types";

// Bidirectional context for a note: which notes cite this one (backlinks —
// the inverted index Obsidian users live in) and which notes are topically
// close (TF-IDF over the vault corpus). Server component.

interface Props {
  note: BrainNote;
  titleOf: (slug: string) => string;
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

export function NoteConnections({ note, titleOf }: Props) {
  return (
    <section className="conn" aria-label="Connections">
      <div className="conn__group">
        <h2 className="conn__title">
          <Icon name="link" size={13} />
          Linked from
          <span className="conn__count">{note.backlinks.length}</span>
        </h2>
        <ConnectionList
          slugs={note.backlinks}
          titleOf={titleOf}
          emptyText="No notes link here yet."
        />
      </div>
      <div className="conn__group">
        <h2 className="conn__title">
          <Icon name="arrow" size={13} />
          Links to
          <span className="conn__count">{note.outbound.length}</span>
        </h2>
        <ConnectionList
          slugs={note.outbound}
          titleOf={titleOf}
          emptyText="This note links nowhere."
        />
      </div>
      <div className="conn__group">
        <h2 className="conn__title">
          <Icon name="spark" size={13} />
          Related by content
        </h2>
        <ConnectionList
          slugs={note.related}
          titleOf={titleOf}
          emptyText="No topically similar notes."
        />
      </div>
    </section>
  );
}
