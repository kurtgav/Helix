import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Icon } from "@/components/Icon";
import { demoRoiSnapshot } from "@/lib/demo";
import { formatPesos, formatHours, formatDuration } from "@/lib/format";

// Server component: reads ROI from seeded events via @helix/core (no client JS).
export default function DashboardPage() {
  const roi = demoRoiSnapshot();

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">Eligibility &amp; Pre-Auth Agent</p>
          <h1 className="page-title">This month, Helix earned its keep.</h1>
          <p className="page-sub">
            Every walk-in verified, every likely denial caught before submission,
            every LOA drafted for you — logged and reversible.
          </p>
        </div>
        <Link href="/verify" className="btn btn--primary btn--lg">
          New verification
          <Icon name="arrow" size={17} />
        </Link>
      </div>

      <section className="roi" aria-label="Return on investment this month">
        <Card elevated className="tile tile--hero">
          <p className="tile__label">Denials likely prevented</p>
          <p className="tile__value">{formatPesos(roi.pesosRecovered)}</p>
          <p className="tile__foot">
            {roi.denialsPrevented} would-be denials caught before submission
          </p>
        </Card>
        <Card className="tile">
          <p className="tile__label">Checks run</p>
          <p className="tile__value">{roi.checksRun}</p>
          <p className="tile__foot">walk-ins verified</p>
        </Card>
        <Card className="tile">
          <p className="tile__label">Hours saved</p>
          <p className="tile__value">{formatHours(roi.hoursSaved)}</p>
          <p className="tile__foot">vs. manual portal / phone checks</p>
        </Card>
        <Card className="tile">
          <p className="tile__label">Avg time to verify</p>
          <p className="tile__value">{formatDuration(roi.avgTimeToVerifyMs)}</p>
          <p className="tile__foot">agent turnaround per check</p>
        </Card>
        <Card className="tile">
          <p className="tile__label">Denials prevented</p>
          <p className="tile__value">{roi.denialsPrevented}</p>
          <p className="tile__foot">claims kept clean</p>
        </Card>
      </section>

      <section aria-label="How a verification works">
        <div className="flow">
          <div className="flow__step">
            <h3>Intake</h3>
            <p>Patient, coverage, and requested service — a few fields.</p>
          </div>
          <div className="flow__step">
            <h3>Verify</h3>
            <p>Helix checks eligibility and applies payer requirement rules.</p>
          </div>
          <div className="flow__step">
            <h3>Review</h3>
            <p>Status, benefit, missing docs, and a drafted LOA — all cited.</p>
          </div>
          <div className="flow__step">
            <h3>Approve</h3>
            <p>You approve or edit. Helix records it to the audit trail.</p>
          </div>
        </div>
      </section>

      <div style={{ marginTop: "var(--sp-6)" }}>
        <Card>
          <CardBody>
            <p className="muted" style={{ fontSize: "var(--fs-sm)" }}>
              Synthetic demo data. Real payer integration is behind a flag. Nothing
              reaches a payer without a human approving it.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
