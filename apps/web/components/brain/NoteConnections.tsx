import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { BrainNote } from "@/lib/brain/types";
import type { Dict } from "@/lib/i18n";

// Bidirectional context for a note: which notes cite this one (backlinks —
// the inverted index Obsidian users live in) and which notes are topically
// close (TF-IDF over the vault corpus). Server component — the overflow
// disclosure is a plain <details>, so capping ships zero client JS.

interface Props {
  note: BrainNote;
  titleOf: (slug: string) => string;
  t: Dict["brain"];
}

/** Hub notes (the MOC) have dozens of backlinks; past this the list folds. */
const VISIBLE_LIMIT = 6;

function ConnectionItem({ slug, titleOf }: { slug: string; titleOf: (slug: string) => string }) {
  return (
    <li>
      <Link href={`/brain/${slug}`} className="conn__link">
        <Icon name="doc" size={13} />
        <span>{titleOf(slug)}</span>
      </Link>
    </li>
  );
}

function ConnectionList({
  slugs,
  titleOf,
  emptyText,
  t,
}: {
  slugs: readonly string[];
  titleOf: (slug: string) => string;
  emptyText: string;
  t: Dict["brain"];
}) {
  if (slugs.length === 0) {
    return <p className="conn__empty">{emptyText}</p>;
  }
  const visible = slugs.slice(0, VISIBLE_LIMIT);
  const overflow = slugs.slice(VISIBLE_LIMIT);
  return (
    <>
      <ul className="conn__list">
        {visible.map((slug) => (
          <ConnectionItem key={slug} slug={slug} titleOf={titleOf} />
        ))}
      </ul>
      {overflow.length > 0 ? (
        <details className="conn__more">
          <summary className="conn__more-summary">
            {/* Both labels ship; [open] CSS swaps them — no client JS. */}
            <span className="conn__more-closed">{t.connShowAll(slugs.length)}</span>
            <span className="conn__more-open">{t.connShowFewer}</span>
          </summary>
          <ul className="conn__list">
            {overflow.map((slug) => (
              <ConnectionItem key={slug} slug={slug} titleOf={titleOf} />
            ))}
          </ul>
        </details>
      ) : null}
    </>
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
          t={t}
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
          t={t}
        />
      </div>
      <div className="conn__group">
        <h2 className="conn__title">
          <Icon name="spark" size={13} />
          {t.connRelated}
        </h2>
        <ConnectionList
          slugs={note.related}
          titleOf={titleOf}
          emptyText={t.connEmptyRelated}
          t={t}
        />
      </div>
    </section>
  );
}
