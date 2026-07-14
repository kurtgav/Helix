import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import { getDashboardRoi } from "@/lib/agents";
import { getConsoleData } from "@/lib/console";
import { getDict } from "@/lib/i18n/server";
import { formatPesos, formatHours, formatDuration } from "@/lib/format";
import { EncounterTable } from "@/components/console/EncounterTable";
import "../console/console.css";
import "./dashboard.css";

// Server component. ROI is LIVE: computed from persisted encounters when a
// database is configured, and from the seeded demo baseline otherwise. No client
// JS. The badge tells the operator which they're looking at — honesty over vanity.
// All copy comes from the request-locale dictionary (EN default, FIL switchable).
//
// Composition: KPI band up top, then the working split — recent activity (the
// same PHI-free projection the console renders) beside the how-it-works rail.
export default async function DashboardPage() {
  const [{ roi, live }, consoleView] = await Promise.all([getDashboardRoi(), getConsoleData()]);
  const dict = getDict();
  const t = dict.dashboard;
  const recent = consoleView.encounters.slice(0, 7);
  const now = Date.now();

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
        <Link href="/verify" className="btn btn--primary btn--lg">
          {t.newVerification}
          <Icon name="arrow" size={17} />
        </Link>
      </div>

      <section className="roi" aria-label={t.roiAria}>
        <Card elevated className="tile tile--hero">
          <p className="tile__label">{t.tilePesos}</p>
          <p className="tile__value">{formatPesos(roi.pesosRecovered)}</p>
          <p className="tile__foot">{t.tilePesosFoot(roi.denialsPrevented)}</p>
        </Card>
        <Card className="tile">
          <p className="tile__label">{t.tileChecks}</p>
          <p className="tile__value">{roi.checksRun}</p>
          <p className="tile__foot">{t.tileChecksFoot}</p>
        </Card>
        <Card className="tile">
          <p className="tile__label">{t.tileHours}</p>
          <p className="tile__value">{formatHours(roi.hoursSaved)}</p>
          <p className="tile__foot">{t.tileHoursFoot}</p>
        </Card>
        <Card className="tile">
          <p className="tile__label">{t.tileAvg}</p>
          <p className="tile__value">{formatDuration(roi.avgTimeToVerifyMs)}</p>
          <p className="tile__foot">{t.tileAvgFoot}</p>
        </Card>
        <Card className="tile">
          <p className="tile__label">{t.tileDenials}</p>
          <p className="tile__value">{roi.denialsPrevented}</p>
          <p className="tile__foot">{t.tileDenialsFoot}</p>
        </Card>
      </section>

      <div className="dash-grid">
        <section className="panel" aria-labelledby="dash-activity-heading">
          <div className="panel__head">
            <span className="panel__eyebrow eyebrow">
              <Icon name="pulse" size={13} />
              {t.recentEyebrow}
            </span>
            <h2 id="dash-activity-heading" className="panel__title">
              {t.recentTitle}
            </h2>
            <p className="panel__sub">{t.recentSub}</p>
          </div>
          <Card className="panel__card">
            <EncounterTable rows={recent} now={now} t={dict.console} />
            <Link href="/console" className="dash-more">
              {t.openConsole}
              <Icon name="arrow" size={15} />
            </Link>
          </Card>
        </section>

        <aside className="dash-side">
          <section aria-label={t.flowAria} className="dash-flowcard">
            <ol className="dash-flow">
              <li className="dash-flow__step">
                <h3>{t.flow1Title}</h3>
                <p>{t.flow1Desc}</p>
              </li>
              <li className="dash-flow__step">
                <h3>{t.flow2Title}</h3>
                <p>{t.flow2Desc}</p>
              </li>
              <li className="dash-flow__step">
                <h3>{t.flow3Title}</h3>
                <p>{t.flow3Desc}</p>
              </li>
              <li className="dash-flow__step">
                <h3>{t.flow4Title}</h3>
                <p>{t.flow4Desc}</p>
              </li>
            </ol>
          </section>

          <Card>
            <CardBody>
              <p className="muted" style={{ fontSize: "var(--fs-sm)" }}>
                {t.disclaimer}
              </p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
