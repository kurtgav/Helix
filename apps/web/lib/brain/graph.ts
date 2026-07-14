// Deterministic force-directed layout for the brain link graph, computed on
// the server so the client renders instantly (no layout jump, works without
// JS). Fruchterman–Reingold with seeded initial positions and a fixed cooling
// schedule — pure function of its inputs: same vault → same picture.

import type { BrainGraphEdge, BrainGraphNode, BrainSection } from "./types";

interface LayoutInputNode {
  slug: string;
  title: string;
  section: BrainSection;
  degree: number;
}

/** Mutable working point for the simulation. */
interface Point {
  node: LayoutInputNode;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

/** Deterministic 32-bit hash (FNV-1a) → [0,1). Replaces Math.random so the
 *  initial scatter is a stable function of each slug. */
function hash01(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x100000000;
}

const ITERATIONS = 260;
const PADDING = 0.06; // normalized margin kept clear inside the [0,1] box

/**
 * Lay out the vault graph. Returns nodes with x/y in [0,1] (padding applied).
 * Isolated nodes still get stable positions on the seed ring.
 */
export function layoutGraph(
  inputNodes: readonly LayoutInputNode[],
  edges: readonly BrainGraphEdge[],
): BrainGraphNode[] {
  const n = inputNodes.length;
  if (n === 0) return [];

  // Seed: nodes on a circle, angle from a stable sort + per-slug jitter.
  const ordered = [...inputNodes].sort((a, b) => a.slug.localeCompare(b.slug));
  const points: Point[] = ordered.map((node, i) => {
    const angle = (i / n) * Math.PI * 2 + hash01(node.slug) * 0.5;
    const radius = 0.35 + hash01(`${node.slug}:r`) * 0.1;
    return {
      node,
      x: 0.5 + Math.cos(angle) * radius,
      y: 0.5 + Math.sin(angle) * radius,
      dx: 0,
      dy: 0,
    };
  });

  const bySlug = new Map(points.map((p) => [p.node.slug, p]));
  const springs: Array<{ a: Point; b: Point }> = [];
  for (const [slugA, slugB] of edges) {
    const a = bySlug.get(slugA);
    const b = bySlug.get(slugB);
    if (a && b && a !== b) springs.push({ a, b });
  }

  // Ideal spring length for a unit-area canvas, stretched 30% — vault hubs
  // (the MOC links everything) otherwise collapse the center into a knot.
  const k = Math.sqrt(1 / n) * 1.3;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const p of points) {
      p.dx = 0;
      p.dy = 0;
    }

    // Repulsion between every pair.
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      if (!a) continue;
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        if (!b) continue;
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1e-6) {
          // Coincident points: separate deterministically by index.
          dx = 1e-4 * (i - j);
          dy = 1e-4;
          dist = Math.sqrt(dx * dx + dy * dy);
        }
        const force = (k * k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.dx += fx;
        a.dy += fy;
        b.dx -= fx;
        b.dy -= fy;
      }
    }

    // Attraction along edges.
    for (const { a, b } of springs) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1e-6);
      const force = (dist * dist) / k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.dx -= fx;
      a.dy -= fy;
      b.dx += fx;
      b.dy += fy;
    }

    // Gentle gravity toward the center keeps disconnected pieces on canvas,
    // then apply displacement under a linearly-cooling cap.
    const temp = 0.1 * (1 - iter / ITERATIONS);
    for (const p of points) {
      p.dx += (0.5 - p.x) * 0.06;
      p.dy += (0.5 - p.y) * 0.06;
      const dist = Math.max(Math.sqrt(p.dx * p.dx + p.dy * p.dy), 1e-9);
      const capped = Math.min(dist, temp);
      p.x += (p.dx / dist) * capped;
      p.y += (p.dy / dist) * capped;
    }
  }

  // Normalize into the padded [0,1] box. Guard the degenerate zero-extent case.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = 1 - PADDING * 2;

  return points.map((p) => ({
    slug: p.node.slug,
    title: p.node.title,
    section: p.node.section,
    degree: p.node.degree,
    x: PADDING + ((p.x - minX) / spanX) * scale,
    y: PADDING + ((p.y - minY) / spanY) * scale,
  }));
}
