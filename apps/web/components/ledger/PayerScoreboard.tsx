import { Icon } from "@/components/Icon";
import { formatPesos } from "@/lib/format";
import type { Dict } from "@/lib/i18n";
import type { PayerScorecard } from "@helix/shared";

// Presentational only — pure function of the scorecards + the locale dict
// slice. No state, no data access. One card per payer, grade-toned, with the
// measured behavior rates (never assumed — a payer with no settled history
// says so instead of faking a number).

type LedgerDict = Dict["ledger"];

function percent(rate: number | undefined): string {
  return rate === undefined ? "—" : `${Math.round(rate * 100)}%`;
}

function days(value: number | undefined): string {
  return value === undefined ? "—" : `${value}d`;
}

interface Props {
  scorecards: readonly PayerScorecard[];
  t: LedgerDict;
}

export function PayerScoreboard({ scorecards, t }: Props) {
  return (
    <div className="scoreboard">
      {scorecards.map((card) => (
        <article
          key={card.payerId}
          className="scorecard"
          data-grade={card.grade}
          aria-label={t.gradeAria(card.payerName, card.grade)}
        >
          <header className="scorecard__head">
            <div>
              <h3 className="scorecard__payer">{card.payerName}</h3>
              <p className="scorecard__meta">{t.cardClaims(card.claimCount)}</p>
            </div>
            <span className="scorecard__grade" aria-hidden="true">
              {card.grade}
            </span>
          </header>

          <dl className="scorecard__rates">
            <div className="scorecard__rate">
              <dt>{t.cardMedian}</dt>
              <dd className="mono">{days(card.medianDaysToPay)}</dd>
            </div>
            <div className="scorecard__rate">
              <dt>{t.cardOnTime}</dt>
              <dd className="mono">{percent(card.onTimeRate)}</dd>
            </div>
            <div className="scorecard__rate">
              <dt>{t.cardShortfall}</dt>
              <dd className="mono">{percent(card.shortfallRate)}</dd>
            </div>
            <div className="scorecard__rate">
              <dt>{t.cardDenial}</dt>
              <dd className="mono">{percent(card.denialRate)}</dd>
            </div>
          </dl>

          <footer className="scorecard__foot">
            <span className="scorecard__amount">
              <span className="scorecard__amount-label">{t.cardOutstanding}</span>
              <span className="mono">{formatPesos(card.totalOutstanding)}</span>
            </span>
            {card.overdueCount > 0 ? (
              <span className="scorecard__amount scorecard__amount--overdue">
                <Icon name="alert" size={13} />
                <span className="scorecard__amount-label">{t.cardOverdue}</span>
                <span className="mono">{formatPesos(card.overdueAmount)}</span>
              </span>
            ) : null}
            {card.medianDaysToPay === undefined ? (
              <span className="scorecard__nohistory">{t.cardNoHistory}</span>
            ) : null}
          </footer>
        </article>
      ))}
    </div>
  );
}
