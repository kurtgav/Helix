import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import { getConsoleData } from "@/lib/console";
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

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Operations Console</p>
          <h1 className="page-title">Every action, on the record.</h1>
          <p className="page-sub">
            Live operations and the append-only audit trail — who did what, when,
            and which agent decided it. The proof that autonomy stays accountable.
          </p>
          <p className={`data-badge${live ? " data-badge--live" : ""}`}>
            <span className="data-badge__dot" aria-hidden="true" />
            {live
              ? "Live — projected from persisted rows"
              : "Demo — synthetic, PHI-free activity"}
          </p>
        </div>
      </div>

      <section className="console-tiles" aria-label="Summary">
        <Card className="tile c-tile c-tile--warn">
          <span className="c-tile__ic" aria-hidden="true">
            <Icon name="clipboard" size={18} />
          </span>
          <p className="tile__label">Awaiting approval</p>
          <p className="tile__value">{summary.awaitingApproval}</p>
          <p className="tile__foot">need a human decision</p>
        </Card>
        <Card className="tile c-tile c-tile--ok">
          <span className="c-tile__ic" aria-hidden="true">
            <Icon name="check" size={18} />
          </span>
          <p className="tile__label">Approved</p>
          <p className="tile__value">{summary.approved}</p>
          <p className="tile__foot">cleared and recorded</p>
        </Card>
        <Card className="tile c-tile c-tile--accent">
          <span className="c-tile__ic" aria-hidden="true">
            <Icon name="layers" size={18} />
          </span>
          <p className="tile__label">Encounters</p>
          <p className="tile__value">{summary.total}</p>
          <p className="tile__foot">logged this period</p>
        </Card>
        <Card className="tile c-tile c-tile--seal">
          <span className="c-tile__ic" aria-hidden="true">
            <Icon name="lock" size={18} />
          </span>
          <p className="tile__label">Audit events</p>
          <p className="tile__value">{audit.length}</p>
          <p className="tile__foot">appended · immutable</p>
        </Card>
      </section>

      <div className="console-grid">
        <section className="panel" aria-labelledby="activity-heading">
          <div className="panel__head">
            <span className="panel__eyebrow eyebrow">
              <Icon name="pulse" size={13} />
              Live operations
            </span>
            <h2 id="activity-heading" className="panel__title">
              Recent activity
            </h2>
            <p className="panel__sub">
              Latest encounters — service, payer, and status. No patient
              identifiers.
            </p>
          </div>
          <Card className="panel__card">
            <EncounterTable rows={encounters} now={now} />
          </Card>
        </section>

        <section className="panel panel--ledger" aria-labelledby="audit-heading">
          <div className="panel__head">
            <span className="panel__eyebrow eyebrow">
              <Icon name="shield" size={13} />
              Immutable audit trail
            </span>
            <h2 id="audit-heading" className="panel__title">
              Audit trail
            </h2>
            <p className="panel__sub">
              Every agent decision and human approval, appended in order and never
              altered — with the model and prompt version behind each one.
            </p>
          </div>
          <Card className="panel__card panel__card--ledger">
            <AuditTrail rows={audit} now={now} />
          </Card>
        </section>
      </div>
    </>
  );
}
