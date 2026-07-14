import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Icon } from "@/components/Icon";
import { formatPesos } from "@/lib/format";
import type { RevenueTriageRow } from "@/lib/revenue";
import type { DenialReason, RecoveryAction, RevenueRisk } from "@helix/shared";

// Presentational only — pure function of `rows`. No state, no data access. The
// server page joins findings to cases and hands the rows down.

// Denial reasons render as semantic badges: the fixable/administrative reasons
// read as warnings, the hard dead-ends (exclusion, late filing) as danger, a
// coding fix as info, and no-new-money cases as neutral.
const REASON_LABEL: Record<DenialReason, string> = {
  eligibility_lapsed: "Eligibility lapsed",
  missing_loa: "Missing LOA",
  missing_document: "Missing document",
  service_not_covered: "Not covered",
  coding_mismatch: "Coding mismatch",
  late_filing: "Late filing",
  duplicate_claim: "Duplicate",
  other: "Needs review",
};

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

const ACTION_LABEL: Record<RecoveryAction, string> = {
  resubmit: "Resubmit",
  correct_and_resubmit: "Correct & resubmit",
  appeal: "Appeal",
  contact_payer: "Contact payer",
  write_off: "Write off",
};

const RISK_LABEL: Record<RevenueRisk, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

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
}

export function RevenueTriageTable({ rows }: Props) {
  return (
    <div className="rev-table__scroll">
      <table className="rev-table">
        <thead>
          <tr>
            <th scope="col">Claim</th>
            <th scope="col">Denial reason</th>
            <th scope="col">Recommended action</th>
            <th scope="col" className="rev-table__center">
              Recoverable
            </th>
            <th scope="col" className="rev-table__center">
              Risk
            </th>
            <th scope="col" className="rev-table__right">
              Amount
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
                <Badge tone={REASON_TONE[row.reason]}>{REASON_LABEL[row.reason]}</Badge>
              </td>
              <td>
                <span className="rev-action">{ACTION_LABEL[row.recommendedAction]}</span>
                {row.requiredFixes.length > 0 ? (
                  <span className="rev-action__fixes mono">
                    {row.requiredFixes.join(" · ")}
                  </span>
                ) : null}
              </td>
              <td className="rev-table__center">
                {row.recoverable ? (
                  <span className="rev-reco rev-reco--yes">
                    <Icon name="check" size={13} />
                    Yes
                    <span className="sr-only">, recoverable</span>
                  </span>
                ) : (
                  <span className="rev-reco rev-reco--no">
                    <span aria-hidden="true">—</span>
                    No
                    <span className="sr-only">, not recoverable</span>
                  </span>
                )}
              </td>
              <td className="rev-table__center">
                <span className={`rev-risk rev-risk--${row.risk}`}>
                  {RISK_LABEL[row.risk]}
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
