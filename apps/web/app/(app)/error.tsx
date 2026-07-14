"use client";

import Link from "next/link";

// App-shell error boundary. Any uncaught error thrown while rendering an (app)
// route lands here instead of a blank crash — the operator gets a calm recovery
// path. We render NO error detail (message/stack could leak internals); Next logs
// it server-side. Nothing was sent to a payer, so the safe action is retry.
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="app-error" role="alert">
      <p className="eyebrow">Something interrupted this view</p>
      <h1 className="page-title">We hit a snag.</h1>
      <p className="page-sub">
        The action was not completed and nothing was sent to a payer. Retry, or
        return to the dashboard.
      </p>
      <div className="app-error__actions">
        <button type="button" className="btn btn--primary" onClick={reset}>
          Try again
        </button>
        <Link href="/dashboard" className="btn">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
