// Evidence helpers. Evidence SNIPPETS can carry human-readable PHI (e.g. a
// member directory line "Juan Dela Cruz — Maxicare Prima — active"), so the
// immutable audit trail must store citations (source + ref) ONLY — never the
// snippet. The full, snippet-bearing Evidence still flows to the UI via the
// ProposedAction; it just never lands in the log. See brain/security-and-compliance.

import type { Evidence } from "@helix/shared";

/**
 * Strip snippets, keeping only the stable citation (source + ref). Use this for
 * ANYTHING persisted to the audit log so no raw PHI is retained. Pure.
 */
export function citationsOnly(evidence: readonly Evidence[]): Evidence[] {
  return evidence.map((item) => ({ source: item.source, ref: item.ref }));
}
