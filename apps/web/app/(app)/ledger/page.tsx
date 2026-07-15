import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import { CopyButton } from "@/components/ui/CopyButton";
import { formatPesos } from "@/lib/format";
import { actorCan } from "@/lib/auth";
import { getDict, getLocale } from "@/lib/i18n/server";
import { DEMO_CLAIM_LEDGER } from "@/lib/demo";
import {
  getReceivablesReview,
  toClaimRecords,
  buildLedgerRows,
  resolveLedgerAction,
} from "@/lib/receivables";
import { PayerScoreboard } from "@/components/ledger/PayerScoreboard";
import { ForecastBars } from "@/components/ledger/ForecastBars";
import { LedgerTable } from "@/components/ledger/LedgerTable";
import { LedgerResolveBar } from "@/components/ledger/LedgerResolveBar";
import "./ledger.css";

// Receivables Agent surface (/ledger) — Helix's THIRD AI teammate: payer
// accountability. Server component: it runs the receivables agent over the
// synthetic claim ledger, headlines the money past the payers' own deadlines,
// renders the measured payer scorecards, the collections forecast, the
// per-claim ledger, and the cited follow-up draft — then hands the
// human-in-the-loop resolve control the acting role's capability
// (`revenue.resolve`) and the Server Action that re-enforces it.
export default async function LedgerPage() {
  const action = await getReceivablesReview();
  const {
    findings,
    scorecards,
    forecast,
    followUpDraft,
    totalOutstanding,
    overdueAmount,
    overdueCount,
    claimCount,
  } = action.proposal;
  const rows = buildLedgerRows(findings, toClaimRecords(DEMO_CLAIM_LEDGER));
  const canResolve = actorCan("revenue.resolve");
  const t = getDict().ledger;

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

      <section className="led-hero" aria-label={t.heroAria}>
        <div className="led-hero__lead">
          <p className="led-hero__label">{t.heroLabel}</p>
          <p className="led-hero__value">{formatPesos(overdueAmount)}</p>
          <p className="led-hero__foot">
            {t.heroFoot(overdueCount, formatPesos(totalOutstanding))}
          </p>
        </div>
        <dl className="led-hero__stats">
          <div className="led-hero__stat">
            <dt>{t.statClaims}</dt>
            <dd>{claimCount}</dd>
          </div>
          <div className="led-hero__stat">
            <dt>{t.statOverdue}</dt>
            <dd>{overdueCount}</dd>
          </div>
          <div className="led-hero__stat">
            <dt>{t.statOutstanding}</dt>
            <dd>{formatPesos(totalOutstanding)}</dd>
          </div>
          <div className="led-hero__stat">
            <dt>{t.statConfidence}</dt>
            <dd>{action.confidence.toFixed(2)}</dd>
          </div>
        </dl>
      </section>

      <section className="led-section" aria-label={t.scorecardsAria}>
        <div className="led-section__head">
          <h2 className="section-title">{t.scorecardsTitle}</h2>
          <p className="led-section__note">
            <Icon name="scale" size={14} />
            {t.scorecardsNote}
          </p>
        </div>
        <PayerScoreboard scorecards={scorecards} t={t} />
      </section>

      <div className="led-duo">
        <section className="led-section led-section--forecast" aria-label={t.forecastAria}>
          <div className="led-section__head">
            <h2 className="section-title">{t.forecastTitle}</h2>
            <p className="led-section__note">{t.forecastNote}</p>
          </div>
          <ForecastBars forecast={forecast} t={t} />
        </section>

        <section className="led-section" aria-label={t.tableAria}>
          <div className="led-section__head">
            <h2 className="section-title">{t.tableTitle}</h2>
            <p className="led-section__note">
              <Icon name="shield" size={14} />
              {t.tableNote}
            </p>
          </div>
          <LedgerTable rows={rows} t={t} />
        </section>
      </div>

      <div className="led-grid">
        <section className="led-draft" aria-label={t.draftAria}>
          <div className="led-draft__head">
            <div>
              <p className="eyebrow">{t.draftEyebrow}</p>
              <h2 className="led-draft__title">{t.draftTitle}</h2>
            </div>
            <div className="led-draft__tools">
              <CopyButton
                text={followUpDraft}
                label={t.copyDraft}
                copiedLabel={t.copiedDraft}
              />
              <span className="led-tag">
                <Icon name="doc" size={12} />
                {t.draftTag}
              </span>
            </div>
          </div>
          <pre className="led-draft__body">{followUpDraft}</pre>
        </section>

        <aside className="led-resolve" aria-label={t.resolveAria}>
          <p className="eyebrow">{t.resolveEyebrow}</p>
          <h2 className="led-resolve__title">{t.resolveTitle}</h2>
          <p className="led-resolve__rationale">{action.rationale}</p>

          <div className="led-meta">
            <span className="led-meta__pill">
              <Icon name="gauge" size={13} />
              {t.confidencePill(action.confidence.toFixed(2))}
            </span>
            <span className="led-meta__pill">
              <Icon name="lock" size={13} />
              {t.approvalRequired}
            </span>
          </div>

          <div className="led-cites">
            <h3 className="section-title">{t.citedSources}</h3>
            {action.evidence.length > 0 ? (
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
            ) : (
              <p className="muted">{t.noCitations}</p>
            )}
          </div>

          <LedgerResolveBar
            canResolve={canResolve}
            overdueCount={overdueCount}
            overdueAmount={overdueAmount}
            resolveAction={resolveLedgerAction}
            locale={getLocale()}
          />
        </aside>
      </div>

      <Card>
        <CardBody>
          <p className="muted text-sm">{t.disclaimer}</p>
        </CardBody>
      </Card>
    </>
  );
}
