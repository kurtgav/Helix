"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrainGraphData } from "@/lib/brain/types";

// Interactive link-graph of the vault. Positions are computed SERVER-side by
// the deterministic force layout (lib/brain/graph.ts), so this component only
// draws and handles hover/focus/navigation — no layout jump, tiny JS.

const VIEW_W = 100;
const VIEW_H = 62;

interface Props {
  graph: BrainGraphData;
  /** Slug of the note being viewed — rendered with an active ring. */
  activeSlug?: string;
  /** Accessible name for the figure. */
  label: string;
}

function nodeRadius(degree: number): number {
  return Math.min(2.1 + degree * 0.35, 4.6);
}

export function BrainGraph({ graph, activeSlug, label }: Props) {
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
                aria-label={`${node.title} — ${node.degree} link${node.degree === 1 ? "" : "s"}`}
                className={`graph__node${dim ? " graph__node--dim" : ""}${active ? " graph__node--active" : ""}`}
                data-section={node.section}
              >
                {active ? (
                  <circle cx={cx} cy={cy} r={r + 1.4} className="graph__ring" />
                ) : null}
                <circle cx={cx} cy={cy} r={r} className="graph__dot" />
                <text x={cx} y={cy + r + 2.6} className="graph__label">
                  {node.title}
                </text>
              </a>
            );
          })}
        </g>
      </svg>
      <figcaption className="graph__legend">
        <span className="graph__key" data-section="strategy">Strategy</span>
        <span className="graph__key" data-section="architecture">Architecture</span>
        <span className="graph__key" data-section="loop">Loop</span>
        <span className="graph__key" data-section="delivery">Delivery</span>
        <span className="graph__key" data-section="root">Index</span>
      </figcaption>
    </figure>
  );
}
