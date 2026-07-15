import type { AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { extractHeadings, slugifyHeading } from "@/lib/brain/toc";

// Renders a brain note's markdown body (wikilinks already rewritten by the
// vault loader) as sanitized-by-construction React elements — react-markdown
// builds nodes, no raw-HTML injection path exists. Server component: the whole
// note arrives as HTML, zero client JS.

type AnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode };

function makeNoteAnchor(missingTitle: string) {
  return function NoteAnchor({ href = "", children, ...rest }: AnchorProps) {
    // Wikilink to a note that exists → real client-side navigation.
    if (href.startsWith("/brain/")) {
      return (
        <Link href={href} className="note-link">
          {children}
        </Link>
      );
    }
    // Wikilink whose target is not written yet → an honest stub, not a dead link.
    if (href.startsWith("#missing-")) {
      return (
        <span className="note-link note-link--missing" title={missingTitle}>
          {children}
        </span>
      );
    }
    // External link → new tab, opener-safe.
    if (/^https?:\/\//.test(href)) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="note-link" {...rest}>
          {children}
        </a>
      );
    }
    // In-page anchors and relative paths (rare) render as plain anchors.
    return (
      <a href={href} className="note-link" {...rest}>
        {children}
      </a>
    );
  };
}

function ScrollTable({ children }: { children?: ReactNode }) {
  return (
    <div className="table-scroll">
      <table>{children}</table>
    </div>
  );
}

/* --- Heading anchors ------------------------------------------------------
   The sidebar TOC (built from extractHeadings on the SAME markdown) links to
   #ids, so the rendered <h2>/<h3> must carry exactly those ids. Rather than
   share render state, each rendered heading is keyed back to its extracted id
   by (depth, slugified text); duplicate headings consume the id queue in
   document order — the same order extractHeadings assigned suffixes in. */

/** Minimal structural view of the hast node react-markdown hands renderers. */
interface HastLike {
  type?: string;
  value?: unknown;
  children?: HastLike[];
}

function hastText(node: HastLike | undefined): string {
  if (!node) return "";
  if (node.type === "text" && typeof node.value === "string") return node.value;
  return (node.children ?? []).map((child) => hastText(child)).join("");
}

type HeadingIdOf = (depth: 2 | 3, text: string) => string | undefined;

function makeHeadingIdLookup(markdown: string): HeadingIdOf {
  // Render-local queues; the single server render pass drains them in order.
  const queues = new Map<string, string[]>();
  for (const heading of extractHeadings(markdown)) {
    const key = `${heading.depth}:${slugifyHeading(heading.text)}`;
    const queue = queues.get(key);
    if (queue) {
      queue.push(heading.id);
    } else {
      queues.set(key, [heading.id]);
    }
  }
  // A heading the extractor never saw (exotic syntax) gets NO id — the TOC
  // never points at it, and a missing anchor beats a colliding one.
  return (depth, text) => queues.get(`${depth}:${slugifyHeading(text)}`)?.shift();
}

interface HeadingProps {
  node?: HastLike;
  children?: ReactNode;
}

function makeHeading(depth: 2 | 3, idOf: HeadingIdOf) {
  return function NoteHeading({ node, children }: HeadingProps) {
    const id = idOf(depth, hastText(node));
    return depth === 2 ? <h2 id={id}>{children}</h2> : <h3 id={id}>{children}</h3>;
  };
}

export function NoteBody({
  markdown,
  missingTitle,
}: {
  markdown: string;
  /** Localized tooltip for wikilinks whose target note is not written yet. */
  missingTitle: string;
}) {
  const idOf = makeHeadingIdLookup(markdown);
  return (
    <div className="note-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: makeNoteAnchor(missingTitle),
          table: ScrollTable,
          h2: makeHeading(2, idOf),
          h3: makeHeading(3, idOf),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
