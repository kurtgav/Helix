"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrainGraphData } from "@/lib/brain/types";
import { DICTS, type Locale } from "@/lib/i18n";

// Interactive link-graph of the vault. Positions are computed SERVER-side by
// the deterministic force layout (lib/brain/graph.ts), so this component only
// draws and handles hover/focus/navigation — no layout jump, tiny JS.

const VIEW_W = 100;
const VIEW_H = 70;

interface Props {
  graph: BrainGraphData;
  /** Slug of the note being viewed — rendered with an active ring. */
  activeSlug?: string;
  /** Accessible name for the figure. */
  label: string;
  /** Hide text labels (the compact sidebar variant) — titles stay available
   *  via each node's tooltip + aria-label. */
  showLabels?: boolean;
  /** Request locale (serializable — template functions stay client-side). */
  locale: Locale;
}

function nodeRadius(degree: number): number {
  return Math.min(1.3 + degree * 0.2, 2.7);
}

const LABEL_MAX = 24;

function truncateTitle(title: string): string {
  return title.length > LABEL_MAX ? `${title.slice(0, LABEL_MAX - 1).trimEnd()}…` : title;
}

export function BrainGraph({ graph, activeSlug, label, showLabels = true, locale }: Props) {
  const t = DICTS[locale].brain;
  const router = useRouter();
  const [hovered, setHovered] = useState<string | undefined>(undefined);

  const neighbours = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [a, b] of graph.edges) {
      (map.get(a) ?? map.set(a, new Set()).get(a)!).add(b);
      (map.get(b) ?? map.set(b, new Set()).get(b)!).add(a);
    }
    return map;
  }, [graph.edges]);

  const positions = useMemo(
    () => new Map(graph.nodes.map((n) => [n.slug, n])),
    [graph.nodes],
  );

  const focusSlug = hovered ?? activeSlug;
  const focusSet = focusSlug ? (neighbours.get(focusSlug) ?? new Set<string>()) : undefined;

  const isDimmed = (slug: string): boolean => {
    if (!focusSlug || !focusSet) return false;
    return slug !== focusSlug && !focusSet.has(slug);
  };

  return (
    <figure className="graph" aria-label={label}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="graph__svg"
        role="img"
        aria-label={label}
      >
        <g>
          {graph.edges.map(([a, b]) => {
            const pa = positions.get(a);
            const pb = positions.get(b);
            if (!pa || !pb) return null;
            const lit =
              focusSlug !== undefined && (a === focusSlug || b === focusSlug);
            const dim = focusSlug !== undefined && !lit;
            return (
              <line
                key={`${a}|${b}`}
                x1={pa.x * VIEW_W}
                y1={pa.y * VIEW_H}
                x2={pb.x * VIEW_W}
                y2={pb.y * VIEW_H}
                className={`graph__edge${lit ? " graph__edge--lit" : ""}${dim ? " graph__edge--dim" : ""}`}
              />
            );
          })}
        </g>
        <g>
          {graph.nodes.map((node) => {
            const cx = node.x * VIEW_W;
            const cy = node.y * VIEW_H;
            const r = nodeRadius(node.degree);
            const active = node.slug === activeSlug;
            const dim = isDimmed(node.slug);
            return (
              <a
                key={node.slug}
                href={`/brain/${node.slug}`}
                onClick={(event) => {
                  event.preventDefault();
                  router.push(`/brain/${node.slug}`);
                }}
                onMouseEnter={() => setHovered(node.slug)}
                onMouseLeave={() => setHovered(undefined)}
                onFocus={() => setHovered(node.slug)}
                onBlur={() => setHovered(undefined)}
                aria-label={t.graphNodeAria(node.title, node.degree)}
                className={`graph__node${dim ? " graph__node--dim" : ""}${active ? " graph__node--active" : ""}`}
                data-section={node.section}
              >
                <title>{node.title}</title>
                {active ? (
                  <circle cx={cx} cy={cy} r={r + 1.4} className="graph__ring" />
                ) : null}
                <circle cx={cx} cy={cy} r={r} className="graph__dot" />
                {showLabels ? (
                  <text
                    x={cx}
                    // Upper-half nodes label above, lower-half below — halves
                    // the label collisions in the dense middle band. Clamped at
                    // the canvas rim so edge labels never clip out of view.
                    y={
                      node.y < 0.5 || node.y > 0.92
                        ? node.y < 0.08
                          ? cy + r + 2.6
                          : cy - r - 1.3
                        : cy + r + 2.6
                    }
                    className="graph__label"
                    // Edge nodes anchor inward so labels never clip the canvas.
                    textAnchor={node.x < 0.16 ? "start" : node.x > 0.84 ? "end" : "middle"}
                  >
                    {truncateTitle(node.title)}
                  </text>
                ) : null}
              </a>
            );
          })}
        </g>
      </svg>
      <figcaption className="graph__legend">
        <span className="graph__key" data-section="strategy">{t.legendStrategy}</span>
        <span className="graph__key" data-section="architecture">{t.legendArchitecture}</span>
        <span className="graph__key" data-section="loop">{t.legendLoop}</span>
        <span className="graph__key" data-section="delivery">{t.legendDelivery}</span>
        <span className="graph__key" data-section="root">{t.legendIndex}</span>
      </figcaption>
    </figure>
  );
}
