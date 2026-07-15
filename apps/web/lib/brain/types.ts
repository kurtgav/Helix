// Shared shapes for the in-product brain explorer. Everything here is
// JSON-serializable on purpose: note metadata flows from the server-side vault
// loader into client components (search, graph) as plain props.

/** Top-level vault folder a note lives in. `root` = the vault root (the MOC). */
export type BrainSection = "strategy" | "architecture" | "loop" | "delivery" | "root";

/** Provenance fields read from note frontmatter — who/what produced the note,
 *  in which loop run, and how much to trust it. All optional: the renderer
 *  shows an honest "—" rather than inventing values. */
export interface BrainProvenance {
  model?: string;
  run?: string;
  confidence?: string;
  source?: string;
}

/** One note's metadata — everything except the markdown body. */
export interface BrainNoteMeta {
  /** Filename without extension; doubles as the /brain/[slug] route param. */
  slug: string;
  /** First `#` heading, falling back to a humanized slug. */
  title: string;
  section: BrainSection;
  /** Frontmatter `type` (moc | strategy | architecture | loop | delivery | …). */
  type: string;
  /** Frontmatter `updated` (ISO date string), when present. */
  updated?: string;
  /** Frontmatter `status`, when present (e.g. "draft — needs validation"). */
  status?: string;
  provenance: BrainProvenance;
  /** First body paragraph, markdown-stripped and clamped. */
  excerpt: string;
  wordCount: number;
  /** Slugs this note links to that exist in the vault (deduped). */
  outbound: string[];
  /** Wikilink targets that do NOT resolve to a note — surfaced, not hidden. */
  unresolved: string[];
  /** Slugs of notes that link here (computed inverted index). */
  backlinks: string[];
  /** Top TF-IDF neighbours (slugs), excluding self. */
  related: string[];
}

/** Full note: metadata + renderable body. */
export interface BrainNote extends BrainNoteMeta {
  /** Markdown body with wikilinks already rewritten to /brain/... links. */
  markdown: string;
  /** Markdown-stripped plain text (search + TF-IDF corpus). */
  plain: string;
}

/** Compact per-note document shipped to the client for full-text search. */
export interface BrainSearchDoc {
  slug: string;
  title: string;
  section: BrainSection;
  type: string;
  excerpt: string;
  /** Full plain text, original casing (client lowercases for matching). */
  text: string;
}

/** A node positioned by the deterministic force layout, in [0,1] coordinates. */
export interface BrainGraphNode {
  slug: string;
  title: string;
  section: BrainSection;
  /** Link degree (in+out), used for node sizing. */
  degree: number;
  x: number;
  y: number;
}

/** An edge between two known notes (source slug, target slug). */
export type BrainGraphEdge = readonly [string, string];

export interface BrainGraphData {
  nodes: BrainGraphNode[];
  edges: BrainGraphEdge[];
}

/** Aggregate stats for the explorer header. */
export interface BrainStats {
  noteCount: number;
  linkCount: number;
  /** Max frontmatter `updated` across notes (ISO date string), if any. */
  lastUpdated?: string;
  sections: readonly BrainSection[];
  /** Share (0..1) of notes carrying full provenance — model AND run AND
   *  confidence. Computed, never asserted: the tile must not claim 100%
   *  unless the vault actually earns it. */
  provenanceCoverage: number;
}
