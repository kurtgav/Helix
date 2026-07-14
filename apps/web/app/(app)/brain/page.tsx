import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import { actorCan } from "@/lib/auth";
import { getVault } from "@/lib/brain/vault";
import { BrainGraph } from "@/components/brain/BrainGraph";
import { BrainSearch } from "@/components/brain/BrainSearch";
import { NoteCard } from "@/components/brain/NoteCard";
import { AccessNotice } from "@/components/brain/AccessNotice";
import type { BrainSection } from "@/lib/brain/types";
import "./brain.css";

export const metadata: Metadata = {
  title: "Brain — Helix",
  description:
    "The company brain, open for inspection: every decision, its provenance, and the links between them.",
};

// The brain explorer — the vault this product is run by, readable in-product.
// Server component: the vault is loaded from the repo filesystem, the graph is
// laid out server-side, and RBAC gates the whole surface (brain.read, staff+).

const SECTION_TITLES: Record<BrainSection, { title: string; sub: string }> = {
  root: { title: "Index", sub: "The map of content — start here." },
  strategy: { title: "Strategy", sub: "Why this wedge, who pays, what would kill it." },
  architecture: { title: "Architecture", sub: "The OS shape: agents, substrate, security." },
  loop: { title: "The Loop", sub: "How the autonomous loop runs — and every decision it made." },
  delivery: { title: "Delivery", sub: "What shipped, with acceptance evidence." },
};

export default function BrainPage() {
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
  const { stats } = vault;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Company Brain</p>
          <h1 className="page-title">Every decision, inspectable.</h1>
          <p className="page-sub">
            The knowledge base this company is actually run by — written by the AI loop,
            versioned in git, linked like a mind. Every note carries its provenance:
            which model, which run, what confidence, what source.
          </p>
          <p className="data-badge data-badge--live">
            <span className="data-badge__dot" aria-hidden="true" />
            Live — rendered from the committed vault
          </p>
        </div>
      </div>

      <section className="brain-tiles" aria-label="Vault summary">
        <Card className="tile b-tile">
          <span className="b-tile__ic" aria-hidden="true">
            <Icon name="doc" size={18} />
          </span>
          <p className="tile__label">Notes</p>
          <p className="tile__value">{stats.noteCount}</p>
          <p className="tile__foot">markdown, git-versioned</p>
        </Card>
        <Card className="tile b-tile">
          <span className="b-tile__ic" aria-hidden="true">
            <Icon name="link" size={18} />
          </span>
          <p className="tile__label">Links</p>
          <p className="tile__value">{stats.linkCount}</p>
          <p className="tile__foot">bidirectional, zero broken</p>
        </Card>
        <Card className="tile b-tile">
          <span className="b-tile__ic" aria-hidden="true">
            <Icon name="fingerprint" size={18} />
          </span>
          <p className="tile__label">Provenance</p>
          <p className="tile__value">100%</p>
          <p className="tile__foot">model + run on every note</p>
        </Card>
        <Card className="tile b-tile">
          <span className="b-tile__ic" aria-hidden="true">
            <Icon name="clock" size={18} />
          </span>
          <p className="tile__label">Last updated</p>
          <p className="tile__value b-tile__value--date">{stats.lastUpdated ?? "—"}</p>
          <p className="tile__foot">newest note revision</p>
        </Card>
      </section>

      <BrainSearch />

      <section className="brain-graph-panel" aria-label="Knowledge graph">
        <Card className="brain-graph-card">
          <div className="brain-graph-head">
            <h2 className="brain-h2">
              <Icon name="pulse" size={14} />
              The graph
            </h2>
            <p className="brain-sub">
              Notes and the wikilinks between them. Hover to trace a neighborhood; click to read.
            </p>
          </div>
          <BrainGraph graph={vault.graph} label="Knowledge graph of all brain notes" />
        </Card>
      </section>

      {stats.sections.map((section) => {
        const notes = vault.notes.filter((n) => n.section === section);
        if (notes.length === 0) return null;
        const { title, sub } = SECTION_TITLES[section];
        return (
          <section key={section} className="brain-section" aria-label={title}>
            <div className="brain-section__head">
              <h2 className="brain-h2">{title}</h2>
              <p className="brain-sub">{sub}</p>
            </div>
            <div className="brain-grid">
              {notes.map((note) => (
                <NoteCard key={note.slug} note={note} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
