// TF-IDF relatedness over the vault corpus — the "semantic-lite" layer behind
// the explorer's Related panel. Pure functions, no dependencies. On an
// ~20-note corpus this computes in well under a millisecond; if the vault ever
// outgrows in-process TF-IDF, this seam is where pgvector embeddings plug in
// (see brain/architecture/tech-stack).

/** Minimal English stopword list — enough to keep TF-IDF signal on prose. */
const STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was",
  "one", "our", "out", "day", "get", "has", "him", "his", "how", "man", "new",
  "now", "old", "see", "two", "way", "who", "did", "its", "let", "she", "too",
  "use", "that", "with", "have", "this", "will", "your", "from", "they", "know",
  "want", "been", "good", "much", "some", "time", "very", "when", "come", "here",
  "just", "like", "long", "make", "many", "more", "only", "over", "such", "take",
  "than", "them", "well", "were", "what", "does", "each", "into", "then", "there",
  "these", "which", "while", "would", "about", "after", "before", "their", "other",
  "every", "where", "still", "being", "under", "never", "between", "should",
]);

/** Lowercase word tokens, ≥3 chars, stopwords removed. */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z0-9]{2,}/g) ?? []).filter(
    (token) => !STOPWORDS.has(token),
  );
}

interface CorpusDoc {
  slug: string;
  text: string;
}

/** Sparse TF-IDF vector: term → weight. */
type Vector = Map<string, number>;

function buildVectors(docs: readonly CorpusDoc[]): Map<string, Vector> {
  const tokenized = docs.map((doc) => ({ slug: doc.slug, tokens: tokenize(doc.text) }));

  // Document frequency per term.
  const df = new Map<string, number>();
  for (const { tokens } of tokenized) {
    for (const term of new Set(tokens)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const n = docs.length;
  const vectors = new Map<string, Vector>();
  for (const { slug, tokens } of tokenized) {
    const tf = new Map<string, number>();
    for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);

    const vector: Vector = new Map();
    for (const [term, count] of tf) {
      const idf = Math.log(1 + n / (df.get(term) ?? 1));
      vector.set(term, (count / tokens.length) * idf);
    }
    vectors.set(slug, vector);
  }
  return vectors;
}

function cosine(a: Vector, b: Vector): number {
  // Iterate the smaller vector for the dot product.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, weight] of small) {
    const other = large.get(term);
    if (other !== undefined) dot += weight * other;
  }
  if (dot === 0) return 0;
  let normA = 0;
  for (const w of a.values()) normA += w * w;
  let normB = 0;
  for (const w of b.values()) normB += w * w;
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * For every doc, its top-k most similar other docs (slug list, best first).
 * Deterministic: score desc, then slug asc as tie-break. Zero-similarity
 * neighbours are omitted — an empty list is honest, a random one is not.
 */
export function relatedBySimilarity(
  docs: readonly CorpusDoc[],
  k = 5,
): Map<string, string[]> {
  const vectors = buildVectors(docs);
  const result = new Map<string, string[]>();

  for (const doc of docs) {
    const own = vectors.get(doc.slug);
    if (!own) continue;
    const scored: Array<{ slug: string; score: number }> = [];
    for (const other of docs) {
      if (other.slug === doc.slug) continue;
      const vector = vectors.get(other.slug);
      if (!vector) continue;
      const score = cosine(own, vector);
      if (score > 0) scored.push({ slug: other.slug, score });
    }
    scored.sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
    result.set(
      doc.slug,
      scored.slice(0, k).map((s) => s.slug),
    );
  }
  return result;
}
