"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/Icon";
import { formatPesos } from "@/lib/format";
import { DICTS, type Locale } from "@/lib/i18n";
import type { LedgerDecision, LedgerResolveResult } from "@/lib/receivables";

// The human-in-the-loop control for the Receivables agent. `resolveAction` is
// a Server Action handed down as a prop by the server page — the client holds
// only an RPC reference, never the server-only module. The UI gate below
// (disabled when `canResolve` is false) is cosmetic; the SERVER re-enforces
// `revenue.resolve` inside the action, so a viewer is stopped even if the
// button were somehow re-enabled.

interface Props {
  canResolve: boolean;
  overdueCount: number;
  overdueAmount: number;
  resolveAction: (decision: LedgerDecision) => Promise<LedgerResolveResult>;
  /** Request locale (serializable — template functions stay client-side). */
  locale: Locale;
}

export function LedgerResolveBar({
  canResolve,
  overdueCount,
  overdueAmount,
  resolveAction,
  locale,
}: Props) {
  const t = DICTS[locale].ledger;
  const [pending, setPending] = useState<LedgerDecision | null>(null);
  const [result, setResult] = useState<LedgerResolveResult | null>(null);

  async function handle(decision: LedgerDecision) {
    if (pending || !canResolve) return;
    setPending(decision);
    setResult(null);
    try {
      const res = await resolveAction(decision);
      setResult(res);
    } catch {
      setResult({ ok: false, message: t.resolveError });
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;

  return (
    <div className="resolve">
      <div className="resolve__actions">
        <Button
          variant="primary"
          onClick={() => handle("approved")}
          disabled={!canResolve || busy}
          aria-describedby={canResolve ? undefined : "ledger-perm-note"}
          aria-busy={pending === "approved"}
        >
          {pending === "approved" ? t.recording : t.approveFollowUps}
          {pending === "approved" ? null : <Icon name="check" size={16} />}
        </Button>
        <Button
          variant="ghost"
          onClick={() => handle("rejected")}
          disabled={!canResolve || busy}
          aria-describedby={canResolve ? undefined : "ledger-perm-note"}
          aria-busy={pending === "rejected"}
        >
          {pending === "rejected" ? t.recording : t.holdFollowUps}
        </Button>
      </div>

      {canResolve ? (
        <p className="resolve__stakes">{t.stakes(formatPesos(overdueAmount), overdueCount)}</p>
      ) : (
        <p className="resolve__hint" role="note" id="ledger-perm-note">
          <Icon name="lock" size={14} />
          {t.permHint}
        </p>
      )}

      <div aria-live="polite" className="resolve__status">
        {result ? (
          <p
            className={`decision-note ${
              result.ok ? "decision-note--ok" : "decision-note--danger"
            }`}
            role="status"
          >
            {result.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
