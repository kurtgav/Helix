"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import type { BrainSearchDoc } from "@/lib/brain/types";
import { DICTS, type Locale } from "@/lib/i18n";

// Full-text search over the vault. The corpus (per-note plain text) is served
// by /api/brain/index — RBAC-gated like the pages — and fetched lazily on
// first focus so the explorer HTML stays lean. Matching runs entirely on the
// client: on a ~20-note corpus it is instant on every keystroke.
//
// Dismissal contract: outside click / Escape / the × button close the results
// WITHOUT clearing the query; refocusing the input or editing the query
// reopens them.

interface SearchState {
  status: "idle" | "loading" | "ready" | "error";
  docs: BrainSearchDoc[];
}

interface Hit {
  doc: BrainSearchDoc;
  score: number;
  snippet: { before: string; match: string; after: string } | null;
}

const MAX_RESULTS = 10;
const SNIPPET_RADIUS = 64;

/** Split a query into lowercase terms (same token shape users type). */
function termsOf(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
}

/** Score a doc against terms: every term must appear; title hits weigh most. */
function scoreDoc(doc: BrainSearchDoc, terms: string[]): number | undefined {
  const title = doc.title.toLowerCase();
  const text = doc.text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    const inTitle = title.includes(term);
    const inText = text.includes(term);
    if (!inTitle && !inText) return undefined; // AND semantics
    if (inTitle) score += 8;
    if (inText) {
      // Occurrence count, capped so one long note can't drown the ranking.
      let count = 0;
      let at = text.indexOf(term);
      while (at !== -1 && count < 5) {
        count++;
        at = text.indexOf(term, at + term.length);
      }
      score += count;
    }
  }
  return score;
}

/** Context window around the first body match of the first matching term. */
function snippetFor(doc: BrainSearchDoc, terms: string[]): Hit["snippet"] {
  const text = doc.text;
  const lower = text.toLowerCase();
  for (const term of terms) {
    const at = lower.indexOf(term);
    if (at === -1) continue;
    const start = Math.max(0, at - SNIPPET_RADIUS);
    const end = Math.min(text.length, at + term.length + SNIPPET_RADIUS);
    return {
      before: `${start > 0 ? "…" : ""}${text.slice(start, at)}`,
      match: text.slice(at, at + term.length),
      after: `${text.slice(at + term.length, end)}${end < text.length ? "…" : ""}`,
    };
  }
  return null;
}

export function BrainSearch({ locale }: { locale: Locale }) {
  const t = DICTS[locale].brain;
  const [state, setState] = useState<SearchState>({ status: "idle", docs: [] });
  const [query, setQuery] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const loadStarted = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on any pointer press outside the search root. pointerdown (not
  // click) so the panel is gone before a press elsewhere becomes a drag.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        setDismissed(true);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const load = useCallback(async () => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    setState({ status: "loading", docs: [] });
    try {
      const res = await fetch("/api/brain/index");
      const body = (await res.json()) as {
        success: boolean;
        data?: { docs: BrainSearchDoc[] };
      };
      if (!res.ok || !body.success || !body.data) throw new Error(`HTTP ${res.status}`);
      setState({ status: "ready", docs: body.data.docs });
    } catch {
      loadStarted.current = false; // allow retry
      setState({ status: "error", docs: [] });
    }
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const terms = termsOf(query);
    if (terms.length === 0 || state.status !== "ready") return [];
    const scored: Hit[] = [];
    for (const doc of state.docs) {
      const score = scoreDoc(doc, terms);
      if (score === undefined) continue;
      scored.push({ doc, score, snippet: snippetFor(doc, terms) });
    }
    scored.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title));
    return scored.slice(0, MAX_RESULTS);
  }, [query, state]);

  const showResults = query.trim().length > 0 && !dismissed;

  return (
    <div className="bsearch" role="search" ref={rootRef}>
      <label className="bsearch__box">
        <Icon name="hash" size={15} />
        <span className="sr-only">{t.searchLabel}</span>
        <input
          type="search"
          className="bsearch__input"
          placeholder={t.searchPlaceholder}
          value={query}
          onFocus={() => {
            void load();
            setDismissed(false);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setDismissed(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              // preventDefault: the native <input type=search> Escape would
              // wipe the query — dismissal must keep it.
              event.preventDefault();
              setDismissed(true);
            }
          }}
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      {showResults ? (
        <div className="bsearch__results">
          <div className="bsearch__top">
            <p className="bsearch__meta" aria-live="polite">
              {state.status === "loading" && t.searchLoading}
              {state.status === "error" && t.searchError}
              {state.status === "ready" && t.searchMatches(hits.length)}
            </p>
            <button
              type="button"
              className="bsearch__close"
              aria-label={t.searchClose}
              onClick={() => setDismissed(true)}
            >
              ×
            </button>
          </div>
          {state.status === "error" ? (
            <button type="button" className="bsearch__retry" onClick={load}>
              {t.searchRetry}
            </button>
          ) : null}
          <ul className="bsearch__list">
            {hits.map(({ doc, snippet }) => (
              <li key={doc.slug}>
                <Link href={`/brain/${doc.slug}`} className="bsearch__hit">
                  <span className="bsearch__hit-head">
                    <span className="bsearch__hit-title">{doc.title}</span>
                    <span className="bsearch__hit-section" data-section={doc.section}>
                      {doc.section === "root" ? t.sectionIndexBadge : doc.section}
                    </span>
                  </span>
                  {snippet ? (
                    <span className="bsearch__snippet">
                      {snippet.before}
                      <mark>{snippet.match}</mark>
                      {snippet.after}
                    </span>
                  ) : (
                    <span className="bsearch__snippet">{doc.excerpt}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
