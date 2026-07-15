// Heading anchors for the note page. extractHeadings() runs on the SAME
// markdown string NoteBody renders, and NoteBody re-derives each heading's id
// through the same slugify — so the sidebar TOC and the rendered <h2>/<h3> ids
// agree without any shared render state. Pure functions, no fs, no framework.

import { splitByFences, stripInline } from "./markdown";

export interface TocHeading {
  depth: 2 | 3;
  /** Heading text with inline markdown stripped (what the reader sees). */
  text: string;
  /** Deterministic anchor id, unique within the document. */
  id: string;
}

/** ATX h2/h3 line: up to 3 leading spaces (CommonMark), `## text`, optional
 *  closing `##` sequence. Setext headings are deliberately out of scope — the
 *  vault is ATX-only, and an unmatched heading just renders without an anchor. */
const HEADING_LINE = /^ {0,3}(#{2,3})\s+(.*?)(?:\s+#+)?\s*$/;

/** Anchor fallback when a heading has no alphanumeric characters at all. */
const EMPTY_SLUG_FALLBACK = "section";

/**
 * Lowercased alphanumerics-and-hyphens form of a heading — the id BASE only:
 * uniqueness (the `-2`, `-3` suffixes) is document-scoped and applied by
 * extractHeadings. Exported so NoteBody can key rendered headings back to
 * their extracted ids.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** First id from `base` not yet in `used`: base, base-2, base-3, … */
function uniqueId(base: string, used: ReadonlySet<string>): string {
  const stem = base.length > 0 ? base : EMPTY_SLUG_FALLBACK;
  let candidate = stem;
  for (let n = 2; used.has(candidate); n++) {
    candidate = `${stem}-${n}`;
  }
  return candidate;
}

/**
 * All h2/h3 headings of a markdown document, in order, with unique anchor
 * ids. `#` lines inside fenced code blocks do NOT count (same fence rule as
 * every other transform in this module family).
 */
export function extractHeadings(markdown: string): TocHeading[] {
  const used = new Set<string>();
  const headings: TocHeading[] = [];
  for (const [i, segment] of splitByFences(markdown).entries()) {
    if (i % 2 === 1) continue; // fence — never a heading
    for (const line of segment.split("\n")) {
      const match = line.match(HEADING_LINE);
      if (!match) continue;
      const depth = match[1]?.length === 2 ? 2 : 3;
      const text = stripInline(match[2] ?? "");
      if (text.length === 0) continue;
      const id = uniqueId(slugifyHeading(text), used);
      used.add(id);
      headings.push({ depth, text, id });
    }
  }
  return headings;
}
