import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { findVaultDir, loadVault } from "./vault";

const FIXTURE = join(__dirname, "__fixtures__", "vault");

describe("loadVault (fixture)", () => {
  const vault = loadVault(FIXTURE);

  it("indexes every markdown file with slug, section and title", () => {
    expect(vault.stats.noteCount).toBe(3);
    const index = vault.bySlug.get("00-INDEX");
    expect(index?.section).toBe("root");
    expect(index?.title).toBe("Fixture Vault"); // emoji stripped
    expect(vault.bySlug.get("wedge")?.section).toBe("strategy");
    expect(vault.bySlug.get("journal")?.section).toBe("loop");
  });

  it("reads provenance frontmatter and preserves absence honestly", () => {
    const index = vault.bySlug.get("00-INDEX")!;
    expect(index.provenance).toEqual({
      model: "test-model",
      run: "iteration-9",
      confidence: "high",
      source: "fixture",
    });
    const journal = vault.bySlug.get("journal")!;
    expect(journal.provenance.model).toBeUndefined();
    expect(journal.updated).toBe("2026-07-03");
  });

  it("computes outbound links, backlinks and unresolved targets", () => {
    const index = vault.bySlug.get("00-INDEX")!;
    expect(index.outbound.sort()).toEqual(["journal", "wedge"]);
    expect(index.unresolved).toEqual(["missing-note"]);

    const wedge = vault.bySlug.get("wedge")!;
    // The [[00-INDEX]] inside the code fence must NOT count as a link.
    expect(wedge.outbound).toEqual(["journal"]);
    expect(wedge.backlinks).toEqual(["00-INDEX", "journal"]);
  });

  it("rewrites wikilinks in the rendered markdown", () => {
    const index = vault.bySlug.get("00-INDEX")!;
    expect(index.markdown).toContain("[wedge](/brain/wedge)");
    expect(index.markdown).toContain("[missing-note](#missing-missing-note)");
  });

  it("builds a deduped undirected graph with positions", () => {
    // Edges: index-wedge, index-journal, wedge-journal (deduped both ways).
    expect(vault.graph.edges).toHaveLength(3);
    expect(vault.graph.nodes).toHaveLength(3);
    for (const node of vault.graph.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(1);
    }
  });

  it("relates the two topically-close notes", () => {
    const wedge = vault.bySlug.get("wedge")!;
    expect(wedge.related).toContain("journal");
  });

  it("exposes stats and search docs", () => {
    expect(vault.stats.lastUpdated).toBe("2026-07-03");
    expect(vault.stats.sections).toEqual(["root", "strategy", "loop"]);
    const doc = vault.searchDocs.find((d) => d.slug === "journal");
    expect(doc?.text).toContain("payer eligibility denials");
  });
});

describe("the real repo vault (integrity gate)", () => {
  // This is a deliberate CI tripwire: if a brain note ever links to a note
  // that does not exist, this test names it. The vault is product surface now
  // (ADR-009) — broken links are a shipped bug, not a docs nit.
  const dir = findVaultDir(__dirname);

  it("is found by walking up from the app", () => {
    expect(dir).toBeDefined();
  });

  it("has zero unresolved wikilinks and full provenance coverage", () => {
    const vault = loadVault(dir!);
    expect(vault.stats.noteCount).toBeGreaterThanOrEqual(18);

    const broken = vault.notes
      .filter((n) => n.unresolved.length > 0)
      .map((n) => `${n.slug} → ${n.unresolved.join(", ")}`);
    expect(broken).toEqual([]);

    const missingProvenance = vault.notes
      .filter((n) => n.provenance.model === undefined || n.provenance.run === undefined)
      .map((n) => n.slug);
    expect(missingProvenance).toEqual([]);

    // The MOC must actually be the hub.
    const index = vault.bySlug.get("00-INDEX");
    expect(index).toBeDefined();
    expect(index!.outbound.length).toBeGreaterThanOrEqual(10);
  });
});
