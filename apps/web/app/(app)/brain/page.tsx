import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import { actorCan } from "@/lib/auth";
import { getDict, getLocale } from "@/lib/i18n/server";
import { getVault } from "@/lib/brain/vault";
import { BrainGraph } from "@/components/brain/BrainGraph";
import { BrainSearch } from "@/components/brain/BrainSearch";
import { NoteCard } from "@/components/brain/NoteCard";
import { AccessNotice } from "@/components/brain/AccessNotice";
import type { BrainSection } from "@/lib/brain/types";
import type { Dict } from "@/lib/i18n";
import "./brain.css";

export const metadata: Metadata = {
  title: "Brain — Helix",
  description:
    "The company brain, open for inspection: every decision, its provenance, and the links between them.",
};

// The brain explorer — the vault this product is run by, readable in-product.
// Server component: the vault is loaded from the repo filesystem, the graph is
// laid out server-side, and RBAC gates the whole surface (brain.read, staff+).
// UI chrome renders in the request locale; NOTE CONTENT stays English (the
// vault is a set of English source documents — ADR-010).

function sectionTitles(
  t: Dict["brain"],
): Record<BrainSection, { title: string; sub: string }> {
  return {
    root: { title: t.sectionRootTitle, sub: t.sectionRootSub },
    strategy: { title: t.sectionStrategyTitle, sub: t.sectionStrategySub },
    architecture: { title: t.sectionArchitectureTitle, sub: t.sectionArchitectureSub },
    loop: { title: t.sectionLoopTitle, sub: t.sectionLoopSub },
    delivery: { title: t.sectionDeliveryTitle, sub: t.sectionDeliverySub },
  };
}

export default function BrainPage() {
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
  const { stats } = vault;
  const titles = sectionTitles(t);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-sub">{t.sub}</p>
          <p className="data-badge data-badge--live">
            <span className="data-badge__dot" aria-hidden="true" />
            {t.badge}
          </p>
        </div>
      </div>

      <section className="brain-tiles" aria-label={t.summaryAria}>
        <Card className="tile b-tile">
          <span className="b-tile__ic" aria-hidden="true">
            <Icon name="doc" size={18} />
          </span>
          <p className="tile__label">{t.tileNotes}</p>
          <p className="tile__value">{stats.noteCount}</p>
          <p className="tile__foot">{t.tileNotesFoot}</p>
        </Card>
        <Card className="tile b-tile">
          <span className="b-tile__ic" aria-hidden="true">
            <Icon name="link" size={18} />
          </span>
          <p className="tile__label">{t.tileLinks}</p>
          <p className="tile__value">{stats.linkCount}</p>
          <p className="tile__foot">{t.tileLinksFoot}</p>
        </Card>
        <Card className="tile b-tile">
          <span className="b-tile__ic" aria-hidden="true">
            <Icon name="fingerprint" size={18} />
          </span>
          <p className="tile__label">{t.tileProvenance}</p>
          <p className="tile__value">100%</p>
          <p className="tile__foot">{t.tileProvenanceFoot}</p>
        </Card>
        <Card className="tile b-tile">
          <span className="b-tile__ic" aria-hidden="true">
            <Icon name="clock" size={18} />
          </span>
          <p className="tile__label">{t.tileUpdated}</p>
          <p className="tile__value b-tile__value--date">{stats.lastUpdated ?? "—"}</p>
          <p className="tile__foot">{t.tileUpdatedFoot}</p>
        </Card>
      </section>

      <BrainSearch locale={getLocale()} />

      <section className="brain-graph-panel" aria-label={t.graphAria}>
        <Card className="brain-graph-card">
          <div className="brain-graph-head">
            <h2 className="brain-h2">
              <Icon name="pulse" size={14} />
              {t.graphTitle}
            </h2>
            <p className="brain-sub">{t.graphSub}</p>
          </div>
          <BrainGraph graph={vault.graph} label={t.graphLabel} locale={getLocale()} />
        </Card>
      </section>

      {stats.sections.map((section) => {
        const notes = vault.notes.filter((n) => n.section === section);
        if (notes.length === 0) return null;
        const { title, sub } = titles[section];
        return (
          <section key={section} className="brain-section" aria-label={title}>
            <div className="brain-section__head">
              <h2 className="brain-h2">{title}</h2>
              <p className="brain-sub">{sub}</p>
            </div>
            <div className="brain-grid">
              {notes.map((note) => (
                <NoteCard key={note.slug} note={note} t={t} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
