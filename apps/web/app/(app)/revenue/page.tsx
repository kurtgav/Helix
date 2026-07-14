import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import { formatPesos } from "@/lib/format";
import { actorCan } from "@/lib/auth";
import { DEMO_DENIAL_CASES } from "@/lib/demo";
import {
  getRevenueTriage,
  toDenialCases,
  buildTriageRows,
  resolveRevenueTriageAction,
} from "@/lib/revenue";
import { RevenueTriageTable } from "@/components/revenue/RevenueTriageTable";
import { ResolveBar } from "@/components/revenue/ResolveBar";
import "./revenue.css";

// Revenue Cycle Agent surface (/revenue) — Helix's SECOND AI teammate. Server
// component: it runs the denial-triage agent over synthetic cases, headlines the
// recoverable pesos, renders per-claim findings and the cited resubmission draft,
// then hands the human-in-the-loop resolve control the acting role's capability
// (`revenue.resolve`) and the Server Action that re-enforces it.
export default async function RevenuePage() {
  const action = await getRevenueTriage();
  const { findings, draftMessage, totalRecoverable, recoverableCount, caseCount } =
    action.proposal;
  const rows = buildTriageRows(findings, toDenialCases(DEMO_DENIAL_CASES));
  const canResolve = actorCan("revenue.resolve");
  const notPursued = caseCount - recoverableCount;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Revenue Cycle Agent · Teammate #2</p>
          <h1 className="page-title">Denied claims, worked back to cash.</h1>
          <p className="page-sub">
            Helix triages denied and at-risk claims, classifies each denial into a
            fixed taxonomy, decides what is administratively recoverable, lists the
            fixes, and drafts the resubmission — every call cited, nothing sent until
            a human approves.
          </p>
          <p className="data-badge">
            <span className="data-badge__dot" aria-hidden="true" />
            Synthetic cases · administrative reasoning · no PHI
          </p>
        </div>
        <Link href="/agents" className="link-quiet">
          Meet the team →
        </Link>
      </div>

      <section className="rev-hero" aria-label="Recoverable summary">
        <div className="rev-hero__lead">
          <p className="rev-hero__label">Recoverable this batch</p>
          <p className="rev-hero__value">{formatPesos(totalRecoverable)}</p>
          <p className="rev-hero__foot">
            across <strong>{recoverableCount}</strong> of {caseCount} triaged claims
            — pending human approval before any payer contact
          </p>
        </div>
        <dl className="rev-hero__stats">
          <div className="rev-hero__stat">
            <dt>Claims triaged</dt>
            <dd>{caseCount}</dd>
          </div>
          <div className="rev-hero__stat">
            <dt>Recoverable</dt>
            <dd>{recoverableCount}</dd>
          </div>
          <div className="rev-hero__stat">
            <dt>Write-off / dupe</dt>
            <dd>{notPursued}</dd>
          </div>
          <div className="rev-hero__stat">
            <dt>Confidence</dt>
            <dd>{action.confidence.toFixed(2)}</dd>
          </div>
        </dl>
      </section>

      <section className="rev-section" aria-label="Per-claim triage">
        <div className="rev-section__head">
          <h2 className="section-title">Per-claim triage</h2>
          <p className="rev-section__note">
            <Icon name="shield" size={14} />
            Classified into a fixed taxonomy — no invented payer rules.
          </p>
        </div>
        <RevenueTriageTable rows={rows} />
      </section>

      <div className="rev-grid">
        <section className="rev-draft" aria-label="Drafted resubmission">
          <div className="rev-draft__head">
            <div>
              <p className="eyebrow">Drafted appeal</p>
              <h2 className="rev-draft__title">Resubmission cover note</h2>
            </div>
            <span className="rev-tag">
              <Icon name="doc" size={12} />
              cited · human-approval required
            </span>
          </div>
          <pre className="rev-draft__body">{draftMessage}</pre>
        </section>

        <aside className="rev-resolve" aria-label="Review and resolve">
          <p className="eyebrow">Agent proposes · you dispose</p>
          <h2 className="rev-resolve__title">Review &amp; resolve</h2>
          <p className="rev-resolve__rationale">{action.rationale}</p>

          <div className="rev-meta">
            <span className="rev-meta__pill">
              <Icon name="gauge" size={13} />
              confidence {action.confidence.toFixed(2)}
            </span>
            <span className="rev-meta__pill">
              <Icon name="lock" size={13} />
              approval required
            </span>
          </div>

          <div className="rev-cites">
            <h3 className="section-title">Cited sources</h3>
            <ul className="evidence">
              {action.evidence.map((ev) => (
                <li key={`${ev.source}${ev.ref}`}>
                  {ev.snippet ?? ev.ref}
                  <span className="evidence__src">
                    {ev.source}
                    {ev.ref}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ResolveBar
            canResolve={canResolve}
            recoverableCount={recoverableCount}
            totalRecoverable={totalRecoverable}
            resolveAction={resolveRevenueTriageAction}
          />
        </aside>
      </div>

      <Card>
        <CardBody>
          <p className="muted" style={{ fontSize: "var(--fs-sm)" }}>
            Synthetic denial cases. The agent performs administrative denial triage
            only — no clinical judgment, no invented payer rules — and nothing is
            transmitted to a payer without an authorized human approving it.
          </p>
        </CardBody>
      </Card>
    </>
  );
}
