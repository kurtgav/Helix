import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import { getConsoleData } from "@/lib/console";
import { getDict } from "@/lib/i18n/server";
import { EncounterTable } from "@/components/console/EncounterTable";
import { AuditTrail } from "@/components/console/AuditTrail";
import "./console.css";

// The Operations Console — recent activity + the immutable audit trail, made
// visible. Server component: data is projected on the server (live from persisted
// rows when a database is configured, synthetic otherwise) and rendered to static
// HTML. No patient identifiers cross this boundary. The badge tells the operator
// which data they are looking at — honesty over vanity, matching the dashboard.
export default async function ConsolePage() {
  const { live, encounters, audit, summary } = await getConsoleData();
  const now = Date.now();
  const t = getDict().console;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-sub">{t.sub}</p>
          <p className={`data-badge${live ? " data-badge--live" : ""}`}>
            <span className="data-badge__dot" aria-hidden="true" />
            {live ? t.badgeLive : t.badgeDemo}
          </p>
        </div>
      </div>

      <section className="console-tiles" aria-label={t.summaryAria}>
        <Card className="tile c-tile c-tile--warn">
          <span className="c-tile__ic" aria-hidden="true">
            <Icon name="clipboard" size={18} />
          </span>
          <p className="tile__label">{t.tileAwaiting}</p>
          <p className="tile__value">{summary.awaitingApproval}</p>
          <p className="tile__foot">{t.tileAwaitingFoot}</p>
        </Card>
        <Card className="tile c-tile c-tile--ok">
          <span className="c-tile__ic" aria-hidden="true">
            <Icon name="check" size={18} />
          </span>
          <p className="tile__label">{t.tileApproved}</p>
          <p className="tile__value">{summary.approved}</p>
          <p className="tile__foot">{t.tileApprovedFoot}</p>
        </Card>
        <Card className="tile c-tile c-tile--accent">
          <span className="c-tile__ic" aria-hidden="true">
            <Icon name="layers" size={18} />
          </span>
          <p className="tile__label">{t.tileEncounters}</p>
          <p className="tile__value">{summary.total}</p>
          <p className="tile__foot">{t.tileEncountersFoot}</p>
        </Card>
        <Card className="tile c-tile c-tile--seal">
          <span className="c-tile__ic" aria-hidden="true">
            <Icon name="lock" size={18} />
          </span>
          <p className="tile__label">{t.tileAudit}</p>
          <p className="tile__value">{audit.length}</p>
          <p className="tile__foot">{t.tileAuditFoot}</p>
        </Card>
      </section>

      <div className="console-grid">
        <section className="panel" aria-labelledby="activity-heading">
          <div className="panel__head">
            <span className="panel__eyebrow eyebrow">
              <Icon name="pulse" size={13} />
              {t.activityEyebrow}
            </span>
            <h2 id="activity-heading" className="panel__title">
              {t.activityTitle}
            </h2>
            <p className="panel__sub">{t.activitySub}</p>
          </div>
          <Card className="panel__card">
            <EncounterTable rows={encounters} now={now} t={t} />
          </Card>
        </section>

        <section className="panel panel--ledger" aria-labelledby="audit-heading">
          <div className="panel__head">
            <span className="panel__eyebrow eyebrow">
              <Icon name="shield" size={13} />
              {t.ledgerEyebrow}
            </span>
            <h2 id="audit-heading" className="panel__title">
              {t.ledgerTitle}
            </h2>
            <p className="panel__sub">{t.ledgerSub}</p>
          </div>
          <Card className="panel__card panel__card--ledger">
            <AuditTrail rows={audit} now={now} t={t} />
          </Card>
        </section>
      </div>
    </>
  );
}
