import { formatRelativeTime, type EncounterCardRow } from "@/lib/console";
import type { Dict } from "@/lib/i18n";
import { StatusPill } from "./StatusPill";

// Recent activity — the latest encounters. Service (with a category cue), payer,
// status, and when it was logged. NO patient identifier is rendered; the row id
// is the encounter reference, which also cross-links the audit ledger. The table
// lives in an overflow-x:auto container so narrow screens scroll it, not the page.
export function EncounterTable({
  rows,
  now,
  t,
}: {
  rows: EncounterCardRow[];
  now?: number;
  t: Dict["console"];
}) {
  if (rows.length === 0) {
    return <p className="panel-empty">{t.activityEmpty}</p>;
  }

  return (
    <div className="table-scroll">
      <table className="enc-table">
        <thead>
          <tr>
            <th scope="col">{t.colService}</th>
            <th scope="col">{t.colPayer}</th>
            <th scope="col">{t.colStatus}</th>
            <th scope="col" className="enc-table__right">
              {t.colLogged}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="enc-row">
              <td>
                <span className="enc-service">
                  <span
                    className={`enc-cat enc-cat--${row.category}`}
                    aria-hidden="true"
                  />
                  <span className="enc-service__name">{row.service}</span>
                </span>
                <span className="enc-id mono">{row.id}</span>
              </td>
              <td className="enc-payer">{row.payer}</td>
              <td>
                <StatusPill status={row.status} t={t} />
              </td>
              <td className="enc-table__right">
                <time
                  className="enc-time mono"
                  dateTime={row.at}
                  title={new Date(row.at).toLocaleString("en-PH")}
                >
                  {formatRelativeTime(row.at, now, t)}
                </time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
