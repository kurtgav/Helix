import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import { actorCan } from "@/lib/auth";
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
// with the same permission as the index.

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
  if (!actorCan("brain.read")) {
    return (
      <>
        <div className="page-head">
          <div>
            <p className="eyebrow">Company Brain</p>
            <h1 className="page-title">Open for inspection.</h1>
          </div>
        </div>
        <AccessNotice />
      </>
    );
  }

  const vault = getVault();
  const note = vault.bySlug.get(params.slug);
  if (!note) notFound();

  const titleOf = (slug: string): string => vault.bySlug.get(slug)?.title ?? humanizeSlug(slug);
  const sectionLabel = note.section === "root" ? "index" : note.section;

  return (
    <>
      <nav className="note-crumbs" aria-label="Breadcrumb">
        <Link href="/brain" className="note-crumbs__link">
          <Icon name="arrow" size={12} style={{ transform: "rotate(180deg)" }} />
          Brain
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
                {note.wordCount.toLocaleString()} words
              </span>
              <span className="note-head__stat">
                <Icon name="link" size={13} />
                {note.backlinks.length} backlink{note.backlinks.length === 1 ? "" : "s"}
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
            <NoteBody markdown={note.markdown} />
          </Card>
        </article>

        <aside className="note-side" aria-label="Note context">
          <Card className="note-side__card">
            <ProvenancePanel note={note} />
          </Card>
          <Card className="note-side__card">
            <NoteConnections note={note} titleOf={titleOf} />
          </Card>
          <Card className="note-side__card note-side__graph">
            <h2 className="conn__title">
              <Icon name="pulse" size={13} />
              In the graph
            </h2>
            <BrainGraph
              graph={vault.graph}
              activeSlug={note.slug}
              label={`Knowledge graph centered on ${note.title}`}
              showLabels={false}
            />
          </Card>
        </aside>
      </div>
    </>
  );
}
