import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { formatPesos } from "@/lib/format";
import type { LedgerRow } from "@/lib/receivables";
import type { Dict } from "@/lib/i18n";
import type { DeadlineAssessment, ReceivableStanding } from "@helix/shared";

// Presentational only — pure function of `rows` + the locale dict slice. No
// state, no data access. The server page joins findings to claims and hands
// the rows down. Renders an explicit empty state (an empty ledger must read
// as "nothing to track", never as a broken table).

type LedgerDict = Dict["ledger"];

// Standings render as semantic badges: past-window money is the danger, the
// approaching edge is a warning, settled reads ok, a shortfall needs eyes.
const STANDING_TONE: Record<ReceivableStanding, BadgeTone> = {
  on_track: "neutral",
  due_soon: "warn",
  overdue: "danger",
  settled: "ok",
  underpaid: "warn",
  denied: "neutral",
};

function standingLabel(t: LedgerDict, standing: ReceivableStanding): string {
  switch (standing) {
    case "on_track":
      return t.standingOnTrack;
    case "due_soon":
      return t.standingDueSoon;
    case "overdue":
      return t.standingOverdue;
    case "settled":
      return t.standingSettled;
    case "underpaid":
      return t.standingUnderpaid;
    case "denied":
      return t.standingDenied;
  }
}

// The payer's own payment window, rendered as countdown + date. Settled and
// denied rows have no clock — an explicit dash, never an empty cell.
function WindowCell({
  deadline,
  t,
}: {
  deadline?: DeadlineAssessment;
  t: LedgerDict;
}) {
  if (!deadline) {
    return <span className="led-window led-window--none">{t.windowSettled}</span>;
  }
  if (deadline.daysRemaining < 0) {
    return (
      <span className="led-window led-window--expired">
        {t.windowClosed(deadline.deadline)}
      </span>
    );
  }
  return (
    <span className={`led-window led-window--${deadline.urgency}`}>
      {t.windowDaysLeft(deadline.daysRemaining)}
      <span className="led-window__date mono">{t.windowCloses(deadline.deadline)}</span>
    </span>
  );
}

interface Props {
  rows: readonly LedgerRow[];
  t: LedgerDict;
}

export function LedgerTable({ rows, t }: Props) {
  if (rows.length === 0) {
    return <p className="led-table__empty">{t.tableEmpty}</p>;
  }

  return (
    <div className="led-table__scroll">
      <table className="led-table">
        <thead>
          <tr>
            <th scope="col">{t.colClaim}</th>
            <th scope="col">{t.colPayer}</th>
            <th scope="col">{t.colSubmitted}</th>
            <th scope="col">{t.colStanding}</th>
            <th scope="col">{t.colWindow}</th>
            <th scope="col" className="led-table__right">
              {t.colDays}
            </th>
            <th scope="col" className="led-table__right">
              {t.colOutstanding}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.claimId} data-standing={row.standing}>
              <td>
                <span className="led-claim__service">{row.serviceName}</span>
                <span className="led-claim__meta mono">{row.serviceCode}</span>
              </td>
              <td>{row.payerName}</td>
              <td className="mono">{row.submittedAt}</td>
              <td>
                <Badge tone={STANDING_TONE[row.standing]}>
                  {standingLabel(t, row.standing)}
                </Badge>
              </td>
              <td>
                <WindowCell deadline={row.deadline} t={t} />
              </td>
              <td className="led-table__right mono">{row.daysOutstanding}d</td>
              <td className="led-table__right mono">
                {row.amountOutstanding > 0 ? formatPesos(row.amountOutstanding) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
