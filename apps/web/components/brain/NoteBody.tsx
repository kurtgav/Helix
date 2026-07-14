import type { AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

export function NoteBody({
  markdown,
  missingTitle,
}: {
  markdown: string;
  /** Localized tooltip for wikilinks whose target note is not written yet. */
  missingTitle: string;
}) {
  return (
    <div className="note-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ a: makeNoteAnchor(missingTitle), table: ScrollTable }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
