// Simple string-similarity helpers for duplicate detection during extraction.

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((t) => t.length > 2));
}

// Jaccard similarity over word tokens (length >= 3) — simple, fast, good
// enough to flag near-identical benefit names like
// "Terminal Illness Benefit" vs "Terminal Illness".
export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 && tb.size === 0) return 0;
  let intersect = 0;
  for (const t of ta) if (tb.has(t)) intersect++;
  const union = ta.size + tb.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

export function findBestMatch(
  candidate: string,
  options: { id: string; name: string }[],
  threshold = 0.6
): { id: string; score: number } | null {
  let best: { id: string; score: number } | null = null;
  for (const opt of options) {
    const score = similarity(candidate, opt.name);
    if (score >= threshold && (!best || score > best.score)) {
      best = { id: opt.id, score };
    }
  }
  return best;
}
