import Link from "next/link";
import { VerifyExperience } from "@/components/VerifyExperience";
import { DEMO_PAYERS, DEMO_SERVICES } from "@/lib/demo";

// Server component shell. Passes the demo payer/service catalogs to the client
// experience. No PHI or agent logic here.
export default function VerifyPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">New verification</p>
          <h1 className="page-title">Verify a walk-in.</h1>
          <p className="page-sub">
            Enter the patient, their coverage, and the requested service. Helix
            checks eligibility, applies payer rules, and drafts the LOA.
          </p>
        </div>
        <Link href="/dashboard" className="link-quiet">
          ← Back to dashboard
        </Link>
      </div>
      <VerifyExperience payers={DEMO_PAYERS} services={DEMO_SERVICES} />
    </>
  );
}
