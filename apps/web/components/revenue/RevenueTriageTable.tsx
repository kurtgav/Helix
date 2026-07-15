import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Icon } from "@/components/Icon";
import { formatPesos } from "@/lib/format";
import type { RevenueTriageRow } from "@/lib/revenue";
import type { Dict } from "@/lib/i18n";
import type {
  DeadlineAssessment,
  DenialReason,
  RecoveryAction,
  RevenueRisk,
} from "@helix/shared";

// Presentational only — pure function of `rows` + the locale dict slice. No
// state, no data access. The server page joins findings to cases and hands the
// rows down.

type RevenueDict = Dict["revenue"];

// Denial reasons render as semantic badges: the fixable/administrative reasons
// read as warnings, the hard dead-ends (exclusion, late filing) as danger, a
// coding fix as info, and no-new-money cases as neutral.
const REASON_TONE: Record<DenialReason, BadgeTone> = {
  eligibility_lapsed: "warn",
  missing_loa: "warn",
  missing_document: "warn",
  service_not_covered: "danger",
  coding_mismatch: "info",
  late_filing: "danger",
  duplicate_claim: "neutral",
  other: "neutral",
};

function reasonLabel(t: RevenueDict, reason: DenialReason): string {
  switch (reason) {
    case "eligibility_lapsed":
      return t.reasonEligibilityLapsed;
    case "missing_loa":
      return t.reasonMissingLoa;
    case "missing_document":
      return t.reasonMissingDocument;
    case "service_not_covered":
      return t.reasonNotCovered;
    case "coding_mismatch":
      return t.reasonCodingMismatch;
    case "late_filing":
      return t.reasonLateFiling;
    case "duplicate_claim":
      return t.reasonDuplicate;
    case "other":
      return t.reasonOther;
  }
}

function actionLabel(t: RevenueDict, action: RecoveryAction): string {
  switch (action) {
    case "resubmit":
      return t.actionResubmit;
    case "correct_and_resubmit":
      return t.actionCorrectResubmit;
    case "appeal":
      return t.actionAppeal;
    case "contact_payer":
      return t.actionContactPayer;
    case "write_off":
      return t.actionWriteOff;
  }
}

function riskLabel(t: RevenueDict, risk: RevenueRisk): string {
  switch (risk) {
    case "high":
      return t.riskHigh;
    case "medium":
      return t.riskMedium;
    case "low":
      return t.riskLow;
  }
}

// The governing recovery window, rendered as deadline date + urgency chip.
// No window → an explicit "not time-bound" so silence never reads as safety.
function DeadlineCell({
  deadline,
  t,
}: {
  deadline?: DeadlineAssessment;
  t: RevenueDict;
}) {
  if (!deadline) {
    return <span className="rev-deadline rev-deadline--none">{t.deadlineNone}</span>;
  }
  if (deadline.daysRemaining < 0) {
    return (
      <span className="rev-deadline rev-deadline--expired">
        {t.deadlineClosed}
        <span className="rev-deadline__date mono">{deadline.deadline}</span>
      </span>
    );
  }
  return (
    <span className={`rev-deadline rev-deadline--${deadline.urgency}`}>
      {t.deadlineDaysLeft(deadline.daysRemaining)}
      <span className="rev-deadline__date mono">
        {t.deadlineBy(deadline.deadline)}
      </span>
    </span>
  );
}

// Display names for the known payer keys; unknown keys fall back to the raw key.
const PAYER_LABEL: Record<string, string> = {
  maxicare: "Maxicare",
  philhealth: "PhilHealth",
  intellicare: "Intellicare",
  medicard: "Medicard",
};

function payerLabel(key: string): string {
  return PAYER_LABEL[key] ?? key;
}

interface Props {
  rows: readonly RevenueTriageRow[];
  t: RevenueDict;
}

export function RevenueTriageTable({ rows, t }: Props) {
  return (
    <div className="rev-table__scroll">
      <table className="rev-table">
        <thead>
          <tr>
            <th scope="col">{t.colClaim}</th>
            <th scope="col">{t.colReason}</th>
            <th scope="col">{t.colAction}</th>
            <th scope="col">{t.colDeadline}</th>
            <th scope="col" className="rev-table__center">
              {t.colRecoverable}
            </th>
            <th scope="col" className="rev-table__center">
              {t.colRisk}
            </th>
            <th scope="col" className="rev-table__right">
              {t.colAmount}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.caseId}>
              <td>
                <span className="rev-claim__service">{row.serviceName}</span>
                <span className="rev-claim__meta mono">
                  {row.serviceCode}
                  {row.payerId ? ` · ${payerLabel(row.payerId)}` : ""} · {row.ageDays}d
                </span>
              </td>
              <td>
                <Badge tone={REASON_TONE[row.reason]}>{reasonLabel(t, row.reason)}</Badge>
              </td>
              <td>
                <span className="rev-action">{actionLabel(t, row.recommendedAction)}</span>
                {row.requiredFixes.length > 0 ? (
                  <span className="rev-action__fixes mono">
                    {row.requiredFixes.join(" · ")}
                  </span>
                ) : null}
              </td>
              <td>
                <DeadlineCell deadline={row.deadline} t={t} />
              </td>
              <td className="rev-table__center">
                {row.recoverable ? (
                  <span className="rev-reco rev-reco--yes">
                    <Icon name="check" size={13} />
                    {t.yes}
                    <span className="sr-only">{t.srRecoverable}</span>
                  </span>
                ) : (
                  <span className="rev-reco rev-reco--no">
                    <span aria-hidden="true">—</span>
                    {t.no}
                    <span className="sr-only">{t.srNotRecoverable}</span>
                  </span>
                )}
              </td>
              <td className="rev-table__center">
                <span className={`rev-risk rev-risk--${row.risk}`}>
                  {riskLabel(t, row.risk)}
                </span>
              </td>
              <td className="rev-table__right mono">{formatPesos(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
