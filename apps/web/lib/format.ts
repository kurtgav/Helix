// Pure display formatters — no I/O, deterministic, unit-tested. Used by the
// dashboard ROI panel and the result card. Locale is PH (₱, en-PH).

const PESO = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

/** "₱12,000" — whole pesos, grouped. Negative/NaN collapse to "₱0". */
export function formatPesos(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return PESO.format(0);
  return PESO.format(Math.round(amount));
}

/** "22.5 hrs" / "1 hr" / "0 hrs" — one decimal, trimmed. */
export function formatHours(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return "0 hrs";
  const rounded = Math.round(hours * 10) / 10;
  const label = rounded === 1 ? "hr" : "hrs";
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${label}`;
}

/** Milliseconds -> human duration for "avg time to verify". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) {
    const s = Math.round(seconds * 10) / 10;
    return `${Number.isInteger(s) ? s : s.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  return rem === 0 ? `${minutes}m` : `${minutes}m ${rem}s`;
}
