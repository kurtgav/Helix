import { describe, it, expect } from "vitest";
import { layoutGraph } from "./graph";
import type { BrainGraphEdge } from "./types";

const nodes = [
  { slug: "a", title: "A", section: "strategy" as const, degree: 2 },
  { slug: "b", title: "B", section: "strategy" as const, degree: 1 },
  { slug: "c", title: "C", section: "loop" as const, degree: 1 },
  { slug: "d", title: "D", section: "delivery" as const, degree: 0 },
];
const edges: BrainGraphEdge[] = [
  ["a", "b"],
  ["a", "c"],
];

describe("layoutGraph", () => {
  it("returns every node positioned inside the [0,1] box", () => {
    const laid = layoutGraph(nodes, edges);
    expect(laid).toHaveLength(4);
    for (const node of laid) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(1);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(1);
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  it("is deterministic — same input, same layout", () => {
    expect(layoutGraph(nodes, edges)).toEqual(layoutGraph(nodes, edges));
  });

  it("pulls linked nodes closer than the layout diagonal", () => {
    const laid = layoutGraph(nodes, edges);
    const at = new Map(laid.map((n) => [n.slug, n]));
    const dist = (p: string, q: string) => {
      const a = at.get(p);
      const b = at.get(q);
      if (!a || !b) throw new Error(`missing node ${p} or ${q}`);
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    // Linked pair should sit meaningfully closer than the full canvas diagonal.
    expect(dist("a", "b")).toBeLessThan(Math.SQRT2 * 0.75);
  });

  it("ignores edges that reference unknown slugs", () => {
    const laid = layoutGraph(nodes, [["a", "ghost"], ...edges]);
    expect(laid).toHaveLength(4);
  });

  it("handles the empty and single-node vaults", () => {
    expect(layoutGraph([], [])).toEqual([]);
    const single = layoutGraph(nodes.slice(0, 1), []);
    expect(single).toHaveLength(1);
    expect(Number.isFinite(single[0]?.x)).toBe(true);
  });
});
