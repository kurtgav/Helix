import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import { actorCan } from "@/lib/auth";
import { getDict, getLocale } from "@/lib/i18n/server";
import { getVault } from "@/lib/brain/vault";
import { humanizeSlug } from "@/lib/brain/markdown";
import { NoteBody } from "@/components/brain/NoteBody";
import { ProvenancePanel } from "@/components/brain/ProvenancePanel";
import { NoteConnections } from "@/components/brain/NoteConnections";
import { BrainGraph } from "@/components/brain/BrainGraph";
import { AccessNotice } from "@/components/brain/AccessNotice";
import "../brain.css";

// One brain note: provenance header, the rendered markdown (wikilinks live),
// backlinks + related notes, and the graph centered on this note. RBAC-gated
// with the same permission as the index. Chrome localizes; note content is EN
// source material (ADR-010).

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  const note = getVault().bySlug.get(params.slug);
  const title = note ? note.title : humanizeSlug(params.slug);
  return {
    title: `${title} — Brain — Helix`,
    description: note?.excerpt || "A note from the Helix company brain.",
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
  const sectionLabel = note.section === "root" ? t.sectionIndexBadge : note.section;

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
              showLabels={false}
              locale={getLocale()}
            />
          </Card>
        </aside>
      </div>
    </>
  );
}
