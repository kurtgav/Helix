"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/Icon";
import { formatPesos } from "@/lib/format";
import { DICTS, type Locale } from "@/lib/i18n";
import type { RevenueDecision, ResolveResult } from "@/lib/revenue";

// The human-in-the-loop control. `resolveAction` is a Server Action handed down
// as a prop by the server page — the client holds only an RPC reference, never
// the server-only module. The UI gate below (disabled when `canResolve` is false)
// is cosmetic; the SERVER re-enforces `revenue.resolve` inside the action, so a
// viewer is stopped even if the button were somehow re-enabled. This is the
// "agents propose, humans dispose" seam made real.

interface Props {
  canResolve: boolean;
  recoverableCount: number;
  totalRecoverable: number;
  resolveAction: (decision: RevenueDecision) => Promise<ResolveResult>;
  /** Request locale (serializable — template functions stay client-side). */
  locale: Locale;
}

export function ResolveBar({
  canResolve,
  recoverableCount,
  totalRecoverable,
  resolveAction,
  locale,
}: Props) {
  const t = DICTS[locale].revenue;
  const [pending, setPending] = useState<RevenueDecision | null>(null);
  const [result, setResult] = useState<ResolveResult | null>(null);

  async function handle(decision: RevenueDecision) {
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
          aria-describedby={canResolve ? undefined : "resolve-perm-note"}
          aria-busy={pending === "approved"}
        >
          {pending === "approved" ? t.recording : t.approveRecovery}
          {pending === "approved" ? null : <Icon name="check" size={16} />}
        </Button>
        <Button
          variant="ghost"
          onClick={() => handle("rejected")}
          disabled={!canResolve || busy}
          aria-describedby={canResolve ? undefined : "resolve-perm-note"}
          aria-busy={pending === "rejected"}
        >
          {pending === "rejected" ? t.recording : t.wontPursue}
        </Button>
      </div>

      {canResolve ? (
        <p className="resolve__stakes">{t.stakes(formatPesos(totalRecoverable), recoverableCount)}</p>
      ) : (
        <p className="resolve__hint" role="note" id="resolve-perm-note">
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
