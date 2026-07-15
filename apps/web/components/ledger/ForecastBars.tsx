import { formatPesos } from "@/lib/format";
import type { Dict } from "@/lib/i18n";
import type { CashflowBucket } from "@helix/shared";

// Presentational only — the collections forecast as four proportional CSS
// bars. Pure function of the buckets + dict slice; heights derive from the
// largest bucket so the shape is honest whatever the ledger holds.

type LedgerDict = Dict["ledger"];

interface Props {
  forecast: readonly CashflowBucket[];
  t: LedgerDict;
}

export function ForecastBars({ forecast, t }: Props) {
  const max = Math.max(...forecast.map((bucket) => bucket.expectedAmount), 0);
  const hasMoney = max > 0;

  if (!hasMoney) {
    return <p className="forecast__empty">{t.forecastEmpty}</p>;
  }

  return (
    <ol className="forecast" role="list">
      {forecast.map((bucket, index) => {
        const share = max === 0 ? 0 : bucket.expectedAmount / max;
        return (
          <li key={bucket.label} className="forecast__bucket" data-first={index === 0 ? "true" : undefined}>
            <span className="forecast__amount mono">
              {bucket.expectedAmount > 0 ? formatPesos(bucket.expectedAmount) : "—"}
            </span>
            <span className="forecast__bar-track" aria-hidden="true">
              <span
                className="forecast__bar"
                style={{ blockSize: `${Math.max(share * 100, bucket.expectedAmount > 0 ? 6 : 0)}%` }}
              />
            </span>
            <span className="forecast__label">{bucket.label}</span>
            <span className="forecast__count">{t.forecastAmount(bucket.claimCount)}</span>
          </li>
        );
      })}
    </ol>
  );
}
