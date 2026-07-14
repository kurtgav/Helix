import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import { formatPesos } from "@/lib/format";
import { actorCan } from "@/lib/auth";
import { getDict, getLocale } from "@/lib/i18n/server";
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
  const t = getDict().revenue;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-sub">{t.sub}</p>
          <p className="data-badge">
            <span className="data-badge__dot" aria-hidden="true" />
            {t.badge}
          </p>
        </div>
        <Link href="/agents" className="link-quiet">
          {t.meetTeam}
        </Link>
      </div>

      <section className="rev-hero" aria-label={t.heroAria}>
        <div className="rev-hero__lead">
          <p className="rev-hero__label">{t.heroLabel}</p>
          <p className="rev-hero__value">{formatPesos(totalRecoverable)}</p>
          <p className="rev-hero__foot">{t.heroFoot(recoverableCount, caseCount)}</p>
        </div>
        <dl className="rev-hero__stats">
          <div className="rev-hero__stat">
            <dt>{t.statTriaged}</dt>
            <dd>{caseCount}</dd>
          </div>
          <div className="rev-hero__stat">
            <dt>{t.statRecoverable}</dt>
            <dd>{recoverableCount}</dd>
          </div>
          <div className="rev-hero__stat">
            <dt>{t.statWriteOff}</dt>
            <dd>{notPursued}</dd>
          </div>
          <div className="rev-hero__stat">
            <dt>{t.statConfidence}</dt>
            <dd>{action.confidence.toFixed(2)}</dd>
          </div>
        </dl>
      </section>

      <section className="rev-section" aria-label={t.triageAria}>
        <div className="rev-section__head">
          <h2 className="section-title">{t.triageTitle}</h2>
          <p className="rev-section__note">
            <Icon name="shield" size={14} />
            {t.triageNote}
          </p>
        </div>
        <RevenueTriageTable rows={rows} t={t} />
      </section>

      <div className="rev-grid">
        <section className="rev-draft" aria-label={t.draftAria}>
          <div className="rev-draft__head">
            <div>
              <p className="eyebrow">{t.draftEyebrow}</p>
              <h2 className="rev-draft__title">{t.draftTitle}</h2>
            </div>
            <span className="rev-tag">
              <Icon name="doc" size={12} />
              {t.draftTag}
            </span>
          </div>
          <pre className="rev-draft__body">{draftMessage}</pre>
        </section>

        <aside className="rev-resolve" aria-label={t.resolveAria}>
          <p className="eyebrow">{t.resolveEyebrow}</p>
          <h2 className="rev-resolve__title">{t.resolveTitle}</h2>
          <p className="rev-resolve__rationale">{action.rationale}</p>

          <div className="rev-meta">
            <span className="rev-meta__pill">
              <Icon name="gauge" size={13} />
              {t.confidencePill(action.confidence.toFixed(2))}
            </span>
            <span className="rev-meta__pill">
              <Icon name="lock" size={13} />
              {t.approvalRequired}
            </span>
          </div>

          <div className="rev-cites">
            <h3 className="section-title">{t.citedSources}</h3>
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
            locale={getLocale()}
          />
        </aside>
      </div>

      <Card>
        <CardBody>
          <p className="muted" style={{ fontSize: "var(--fs-sm)" }}>
            {t.disclaimer}
          </p>
        </CardBody>
      </Card>
    </>
  );
}
