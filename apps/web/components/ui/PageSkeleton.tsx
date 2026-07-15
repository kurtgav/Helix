import { getDict } from "@/lib/i18n/server";

// Route-level pending UI shared by every app surface's loading.tsx. The shape
// is deliberately generic — page head, a wide band, a two-panel split — so one
// skeleton reads as "a page is coming" on dashboard/verify/console/revenue/
// ledger/agents/brain alike. Server component: loading files render inside the
// request scope, so the request-locale dictionary is available for the label.
export function PageSkeleton() {
  const t = getDict().common;

  return (
    <div className="skel" role="status" aria-label={t.loading}>
      <div className="skel__head">
        <span className="skel__bar skel__bar--eyebrow" />
        <span className="skel__bar skel__bar--title" />
        <span className="skel__bar skel__bar--sub" />
      </div>
      <div className="skel__band" />
      <div className="skel__grid">
        <div className="skel__panel" />
        <div className="skel__panel" />
      </div>
    </div>
  );
}
