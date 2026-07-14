import "server-only";

// Vault loader — reads the company brain (the Obsidian vault at <repo>/brain)
// straight off the filesystem and projects it into the explorer's shapes. The
// vault IS the source of truth: what ships is exactly what is committed, so the
// in-product view can never drift from the repo (ADR-009 in brain/loop/decisions).
//
// Caching: computed once per process in production (the vault only changes with
// a deploy); recomputed per request in dev so edits show up on refresh.
//
// PHI note: the vault holds strategy/architecture/loop notes — no patient data
// by construction. Nothing here touches the clinical tables.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve, basename, dirname } from "node:path";
import matter from "gray-matter";
import {
  countWords,
  extractExcerpt,
  extractTitle,
  extractWikilinks,
  stripLeadingH1,
  toPlainText,
  transformWikilinks,
} from "./markdown";
import { relatedBySimilarity } from "./related";
import { layoutGraph } from "./graph";
import type {
  BrainGraphData,
  BrainGraphEdge,
  BrainNote,
  BrainSearchDoc,
  BrainSection,
  BrainStats,
} from "./types";

const SECTION_ORDER: readonly BrainSection[] = [
  "root",
  "strategy",
  "architecture",
  "loop",
  "delivery",
];

/** Everything the explorer needs, computed in one pass. */
export interface Vault {
  notes: BrainNote[];
  bySlug: ReadonlyMap<string, BrainNote>;
  stats: BrainStats;
  graph: BrainGraphData;
  searchDocs: BrainSearchDoc[];
}

/**
 * Locate the vault by walking up from `start` until a `brain/00-INDEX.md`
 * appears. Works from apps/web in dev (repo root is two levels up) and from
 * the traced serverless bundle (outputFileTracingIncludes preserves the same
 * relative layout). Returns undefined when no vault is present — callers
 * render an honest empty state rather than crashing the page.
 */
export function findVaultDir(start: string = process.cwd()): string | undefined {
  let dir = resolve(start);
  for (let depth = 0; depth < 6; depth++) {
    const candidate = join(dir, "brain");
    if (existsSync(join(candidate, "00-INDEX.md"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

function listMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path);
    }
  }
  return files;
}

function sectionOf(vaultDir: string, filePath: string): BrainSection {
  const rel = resolve(dirname(filePath));
  if (rel === resolve(vaultDir)) return "root";
  const top = basename(rel);
  if (top === "strategy" || top === "architecture" || top === "loop" || top === "delivery") {
    return top;
  }
  return "root";
}

/** Frontmatter values arrive as unknown YAML — coerce to trimmed string or drop. */
function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number") return String(value);
  // gray-matter parses bare ISO dates into Date objects.
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return undefined;
}

/**
 * Load and index a vault directory. Exported with an explicit `dir` so tests
 * run against a fixture vault; product code goes through getVault().
 */
export function loadVault(dir: string): Vault {
  const files = listMarkdownFiles(dir).sort();

  // Pass 1 — parse every file.
  interface Parsed {
    slug: string;
    section: BrainSection;
    body: string;
    data: Record<string, unknown>;
    targets: string[];
  }
  const parsed: Parsed[] = files.map((file) => {
    const { content, data } = matter(readFileSync(file, "utf8"));
    return {
      slug: basename(file, ".md"),
      section: sectionOf(dir, file),
      body: content,
      data: data as Record<string, unknown>,
      targets: extractWikilinks(content),
    };
  });

  const knownSlugs = new Set(parsed.map((p) => p.slug));

  // Pass 2 — backlinks inverted index.
  const backlinksOf = new Map<string, Set<string>>();
  for (const note of parsed) {
    for (const target of note.targets) {
      if (!knownSlugs.has(target) || target === note.slug) continue;
      const set = backlinksOf.get(target) ?? new Set<string>();
      set.add(note.slug);
      backlinksOf.set(target, set);
    }
  }

  // Pass 3 — TF-IDF related notes over the plain-text corpus.
  const plainOf = new Map(parsed.map((p) => [p.slug, toPlainText(p.body)]));
  const related = relatedBySimilarity(
    parsed.map((p) => ({ slug: p.slug, text: plainOf.get(p.slug) ?? "" })),
    5,
  );

  // Pass 4 — assemble notes.
  const notes: BrainNote[] = parsed.map((p) => {
    const plain = plainOf.get(p.slug) ?? "";
    const outbound = [...new Set(p.targets.filter((t) => knownSlugs.has(t) && t !== p.slug))];
    return {
      slug: p.slug,
      title: extractTitle(p.body, p.slug),
      section: p.section,
      type: asString(p.data.type) ?? "note",
      updated: asString(p.data.updated),
      status: asString(p.data.status),
      provenance: {
        model: asString(p.data.model),
        run: asString(p.data.run),
        confidence: asString(p.data.confidence),
        source: asString(p.data.source),
      },
      excerpt: extractExcerpt(p.body),
      wordCount: countWords(plain),
      outbound,
      unresolved: [...new Set(p.targets.filter((t) => !knownSlugs.has(t)))],
      backlinks: [...(backlinksOf.get(p.slug) ?? [])].sort(),
      related: related.get(p.slug) ?? [],
      markdown: transformWikilinks(stripLeadingH1(p.body), knownSlugs),
      plain,
    };
  });

  // Stable order: section, then slug (with the MOC first inside root).
  notes.sort((a, b) => {
    const sa = SECTION_ORDER.indexOf(a.section);
    const sb = SECTION_ORDER.indexOf(b.section);
    if (sa !== sb) return sa - sb;
    return a.slug.localeCompare(b.slug);
  });

  // Graph: undirected, deduped edges between known notes.
  const edgeKeys = new Set<string>();
  const edges: BrainGraphEdge[] = [];
  for (const note of notes) {
    for (const target of note.outbound) {
      const key = note.slug < target ? `${note.slug}|${target}` : `${target}|${note.slug}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push([note.slug, target]);
    }
  }
  const degree = new Map<string, number>();
  for (const [a, b] of edges) {
    degree.set(a, (degree.get(a) ?? 0) + 1);
    degree.set(b, (degree.get(b) ?? 0) + 1);
  }
  const graph: BrainGraphData = {
    nodes: layoutGraph(
      notes.map((n) => ({
        slug: n.slug,
        title: n.title,
        section: n.section,
        degree: degree.get(n.slug) ?? 0,
      })),
      edges,
    ),
    edges,
  };

  const lastUpdated = notes
    .map((n) => n.updated)
    .filter((u): u is string => u !== undefined)
    .sort()
    .at(-1);

  return {
    notes,
    bySlug: new Map(notes.map((n) => [n.slug, n])),
    stats: {
      noteCount: notes.length,
      linkCount: edges.length,
      lastUpdated,
      sections: SECTION_ORDER.filter((s) => notes.some((n) => n.section === s)),
    },
    graph,
    searchDocs: notes.map((n) => ({
      slug: n.slug,
      title: n.title,
      section: n.section,
      type: n.type,
      excerpt: n.excerpt,
      text: n.plain,
    })),
  };
}

/** Empty vault shape for the (should-never-happen) missing-directory case. */
function emptyVault(): Vault {
  return {
    notes: [],
    bySlug: new Map(),
    stats: { noteCount: 0, linkCount: 0, sections: [] },
    graph: { nodes: [], edges: [] },
    searchDocs: [],
  };
}

let cached: Vault | undefined;

/** The product entrypoint: locate + load the repo vault, cached in prod. */
export function getVault(): Vault {
  if (process.env.NODE_ENV === "production" && cached) return cached;
  const dir = findVaultDir();
  const vault = dir ? loadVault(dir) : emptyVault();
  cached = vault;
  return vault;
}
