import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import { getDashboardRoi } from "@/lib/agents";
import { getDict } from "@/lib/i18n/server";
import { formatPesos, formatHours, formatDuration } from "@/lib/format";

// Server component. ROI is LIVE: computed from persisted encounters when a
// database is configured, and from the seeded demo baseline otherwise. No client
// JS. The badge tells the operator which they're looking at — honesty over vanity.
// All copy comes from the request-locale dictionary (EN default, FIL switchable).
export default async function DashboardPage() {
  const { roi, live } = await getDashboardRoi();
  const t = getDict().dashboard;

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

      <section aria-label={t.flowAria}>
        <div className="flow">
          <div className="flow__step">
            <h3>{t.flow1Title}</h3>
            <p>{t.flow1Desc}</p>
          </div>
          <div className="flow__step">
            <h3>{t.flow2Title}</h3>
            <p>{t.flow2Desc}</p>
          </div>
          <div className="flow__step">
            <h3>{t.flow3Title}</h3>
            <p>{t.flow3Desc}</p>
          </div>
          <div className="flow__step">
            <h3>{t.flow4Title}</h3>
            <p>{t.flow4Desc}</p>
          </div>
        </div>
      </section>

      <div style={{ marginTop: "var(--sp-6)" }}>
        <Card>
          <CardBody>
            <p className="muted" style={{ fontSize: "var(--fs-sm)" }}>
              {t.disclaimer}
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
