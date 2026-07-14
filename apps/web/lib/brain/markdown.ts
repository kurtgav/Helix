// Pure markdown helpers for the brain explorer: wikilink rewriting, title /
// excerpt extraction, and markdown→plain-text stripping for search + TF-IDF.
// No fs, no framework imports — fully unit-testable.

/** Matches [[target]], [[target|alias]], [[target#heading]], [[t#h|alias]]. */
const WIKILINK = /\[\[([^\]|#]+)(?:#([^\]|]*))?(?:\|([^\]]+))?\]\]/g;

/** Slug → "Slug" humanized ("ph-payer-landscape" → "Ph Payer Landscape"). */
export function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => (part.length > 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");
}

/**
 * Split markdown into alternating [text, fence, text, fence, …] segments so
 * transforms can skip fenced code blocks. The fence segments keep their
 * delimiters, so joining the array back yields the original document.
 */
function splitByFences(md: string): string[] {
  return md.split(/(```[\s\S]*?(?:```|$))/);
}

/**
 * Rewrite Obsidian wikilinks into standard markdown links.
 * Known targets   → [label](/brain/<slug>)
 * Unknown targets → [label](#missing-<slug>) — rendered as a "not yet written"
 * stub by the note renderer, never a dead navigation.
 * Fenced code blocks are left untouched.
 */
export function transformWikilinks(md: string, knownSlugs: ReadonlySet<string>): string {
  return splitByFences(md)
    .map((segment, i) => {
      if (i % 2 === 1) return segment; // fence — leave verbatim
      return segment.replace(WIKILINK, (_m, target: string, _head, alias?: string) => {
        const slug = target.trim();
        const label = (alias ?? slug).trim();
        return knownSlugs.has(slug)
          ? `[${label}](/brain/${slug})`
          : `[${label}](#missing-${slug})`;
      });
    })
    .join("");
}

/** Every distinct wikilink target in the document (code fences excluded). */
export function extractWikilinks(md: string): string[] {
  const targets = new Set<string>();
  for (const [i, segment] of splitByFences(md).entries()) {
    if (i % 2 === 1) continue;
    for (const match of segment.matchAll(WIKILINK)) {
      const target = match[1];
      if (target !== undefined) targets.add(target.trim());
    }
  }
  return [...targets];
}

/** First `# ` heading, stripped of leading emoji/symbols; fallback humanized slug. */
export function extractTitle(md: string, fallbackSlug: string): string {
  const heading = md.match(/^#\s+(.+)$/m)?.[1];
  if (heading === undefined) return humanizeSlug(fallbackSlug);
  // Drop leading non-letter decorations (emoji, symbols) but keep the text.
  const cleaned = heading.trim().replace(/^[^\p{L}\p{N}]+\s*/u, "");
  return cleaned.length > 0 ? cleaned : humanizeSlug(fallbackSlug);
}

/** Strip inline markdown syntax from a single line of text. */
function stripInline(text: string): string {
  return text
    .replace(WIKILINK, (_m, target: string, _h, alias?: string) => (alias ?? target).trim())
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images → alt
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → label
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // bold
    .replace(/(\*|_)(.*?)\1/g, "$2") // italics
    .replace(/~~(.*?)~~/g, "$1") // strikethrough
    .trim();
}

/**
 * First real paragraph of the body — skips headings, blockquotes, lists,
 * tables, fences, and HTML comments — stripped of markdown and clamped.
 */
export function extractExcerpt(md: string, maxLength = 220): string {
  const segments = splitByFences(md);
  for (const [i, segment] of segments.entries()) {
    if (i % 2 === 1) continue;
    for (const block of segment.split(/\n{2,}/)) {
      const line = block.trim();
      if (line.length === 0) continue;
      if (/^(#|>|[-*+]\s|\d+\.\s|\||<!--|---)/.test(line)) continue;
      const text = stripInline(line.replace(/\n/g, " "));
      if (text.length === 0) continue;
      return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
    }
  }
  return "";
}

/**
 * Whole document → plain text for full-text search and TF-IDF. Preserves the
 * words of headings, lists, tables and quotes; drops code fences, table rules,
 * HTML comments and markdown syntax.
 */
export function toPlainText(md: string): string {
  const parts: string[] = [];
  for (const [i, segment] of splitByFences(md).entries()) {
    if (i % 2 === 1) continue; // drop code fences from the search corpus
    const withoutComments = segment.replace(/<!--[\s\S]*?-->/g, " ");
    for (const rawLine of withoutComments.split("\n")) {
      let line = rawLine.trim();
      if (line.length === 0) continue;
      if (/^[-:| ]+$/.test(line)) continue; // table rule / hr
      line = line
        .replace(/^#{1,6}\s+/, "")
        .replace(/^>\s?/, "")
        .replace(/^[-*+]\s+(\[[ x]\]\s+)?/, "")
        .replace(/^\d+\.\s+/, "");
      line = stripInline(line.replace(/\|/g, " "));
      if (line.length > 0) parts.push(line);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** Word count over plain text. */
export function countWords(plain: string): number {
  if (plain.length === 0) return 0;
  return plain.split(/\s+/).length;
}

/**
 * Remove the document's leading `# h1` (and any blank lines before it). The
 * note page renders the title itself in its header — leaving the markdown h1
 * in the body would put two <h1>s on the page (broken document outline).
 */
export function stripLeadingH1(md: string): string {
  return md.replace(/^\s*#\s+[^\n]*\n?/, "");
}
