import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import { actorCan } from "@/lib/auth";
import { getDict, getLocale } from "@/lib/i18n/server";
import { getVault } from "@/lib/brain/vault";
import { humanizeSlug } from "@/lib/brain/markdown";
import { sectionTitles } from "@/lib/brain/sections";
import { extractHeadings } from "@/lib/brain/toc";
import { NoteBody } from "@/components/brain/NoteBody";
import { ProvenancePanel } from "@/components/brain/ProvenancePanel";
import { NoteConnections } from "@/components/brain/NoteConnections";
import { BrainGraph } from "@/components/brain/BrainGraph";
import { AccessNotice } from "@/components/brain/AccessNotice";
import "../brain.css";
import "../brain-note.css";

// One brain note: provenance header, the rendered markdown (wikilinks live),
// backlinks + related notes, and the graph centered on this note. RBAC-gated
// with the same permission as the index. Chrome localizes; note content is EN
// source material (ADR-010).

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  // Same gate as the page: without it a viewer reads real note titles and
  // excerpts out of <head>, and can enumerate slugs via 404-vs-denied.
  if (!actorCan("brain.read")) {
    return { title: "Brain — Helix" };
  }
  const note = getVault().bySlug.get(params.slug);
  // Unknown slug 404s HERE, not in the page body: metadata resolves before
  // the loading.tsx suspense shell flushes, so this is the last point where
  // the response can still carry a real 404 status (the e2e asserts it).
  if (!note) notFound();
  return {
    title: `${note.title} — Brain — Helix`,
    description: note.excerpt || "A note from the Helix company brain.",
  };
}

export default function BrainNotePage({ params }: Props) {
  const t = getDict().brain;

  if (!actorCan("brain.read")) {
    return (
      <>
        <div className="page-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h1 className="page-title">{t.titleDenied}</h1>
          </div>
        </div>
        <AccessNotice t={t} />
      </>
    );
  }

  const vault = getVault();
  const note = vault.bySlug.get(params.slug);
  if (!note) notFound();

  const titleOf = (slug: string): string => vault.bySlug.get(slug)?.title ?? humanizeSlug(slug);
  // Same localized titles as the list page's section headers — never the raw
  // English folder slug (ADR-010: chrome localizes, content stays EN).
  const sectionLabel = sectionTitles(t)[note.section].title;
  const headings = extractHeadings(note.markdown);

  return (
    <>
      <nav className="note-crumbs" aria-label={t.crumbAria}>
        <Link href="/brain" className="note-crumbs__link">
          <Icon name="arrow" size={12} style={{ transform: "rotate(180deg)" }} />
          {t.crumbBrain}
        </Link>
        <span className="note-crumbs__sep" aria-hidden="true">
          /
        </span>
        <span className="note-crumbs__here" data-section={note.section}>
          {sectionLabel}
        </span>
      </nav>

      <div className="note-layout">
        <article className="note-main" aria-label={note.title}>
          <header className="note-head">
            <p className="note-head__type" data-section={note.section}>
              {note.type}
            </p>
            <h1 className="note-title">{note.title}</h1>
            <p className="note-head__meta">
              <span className="note-head__stat">
                <Icon name="doc" size={13} />
                {t.words(note.wordCount.toLocaleString())}
              </span>
              <span className="note-head__stat">
                <Icon name="link" size={13} />
                {t.backlinksCount(note.backlinks.length)}
              </span>
              {note.updated ? (
                <time className="note-head__stat" dateTime={note.updated}>
                  <Icon name="clock" size={13} />
                  {note.updated}
                </time>
              ) : null}
            </p>
          </header>
          <Card className="note-paper">
            <NoteBody markdown={note.markdown} missingTitle={t.missingNote} />
          </Card>
        </article>

        <aside className="note-side" aria-label={t.noteAriaContext}>
          <Card className="note-side__card">
            <ProvenancePanel note={note} t={t} />
          </Card>
          {/* Outline only when it can actually orient: 2+ section headings.
              A <section>, NOT a <nav> — the shell owns the single nav landmark. */}
          {headings.length >= 2 ? (
            <Card className="note-side__card">
              <section className="toc" aria-label={t.tocAria}>
                <h2 className="conn__title">
                  <Icon name="hash" size={13} />
                  {t.tocTitle}
                </h2>
                <ol className="toc__list">
                  {headings.map((heading) => (
                    <li key={heading.id} className="toc__item" data-depth={heading.depth}>
                      <a href={`#${heading.id}`} className="toc__link">
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            </Card>
          ) : null}
          <Card className="note-side__card">
            <NoteConnections note={note} titleOf={titleOf} t={t} />
          </Card>
          <Card className="note-side__card note-side__graph">
            <h2 className="conn__title">
              <Icon name="pulse" size={13} />
              {t.inGraph}
            </h2>
            <BrainGraph
              graph={vault.graph}
              activeSlug={note.slug}
              label={t.graphNoteLabel(note.title)}
              showLabels
              locale={getLocale()}
            />
          </Card>
        </aside>
      </div>
    </>
  );
}
