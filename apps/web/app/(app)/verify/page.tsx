import Link from "next/link";
import { VerifyExperience } from "@/components/VerifyExperience";
import { DEMO_PAYERS, DEMO_SERVICES } from "@/lib/demo";
import { getDict, getLocale } from "@/lib/i18n/server";

// Server component shell. Passes the demo payer/service catalogs AND the
// request locale down to the client experience (locale, not dict — dictionary
// template functions cannot cross the RSC prop boundary). No PHI or agent
// logic here.
export default function VerifyPage() {
  const t = getDict().verify;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="page-title">{t.title}</h1>
          <p className="page-sub">{t.sub}</p>
        </div>
        <Link href="/dashboard" className="link-quiet">
          {t.backToDashboard}
        </Link>
      </div>
      <VerifyExperience payers={DEMO_PAYERS} services={DEMO_SERVICES} locale={getLocale()} />
    </>
  );
}
