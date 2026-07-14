import type { EncounterStatus } from "@helix/shared";
import type { Dict } from "@/lib/i18n";

// Encounter status as SEMANTIC color, not decoration: approved reads as safe
// (green / --c-ok), awaiting as attention (amber / --c-warn), rejected as danger
// (red). Tones map to the -soft background variants defined in console.css.
type Tone = "ok" | "warn" | "danger" | "info" | "neutral" | "muted";

const STATUS_TONE: Record<EncounterStatus, Tone> = {
  intake: "neutral",
  verifying: "info",
  awaiting_approval: "warn",
  approved: "ok",
  rejected: "danger",
  closed: "muted",
};

function statusLabel(t: Dict["console"], status: EncounterStatus): string {
  switch (status) {
    case "intake":
      return t.statusIntake;
    case "verifying":
      return t.statusVerifying;
    case "awaiting_approval":
      return t.statusAwaiting;
    case "approved":
      return t.statusApproved;
    case "rejected":
      return t.statusRejected;
    case "closed":
      return t.statusClosed;
  }
}

export function StatusPill({
  status,
  t,
}: {
  status: EncounterStatus;
  t: Dict["console"];
}) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <span className={`status-pill status-pill--${tone}`}>
      <span className="status-pill__dot" aria-hidden="true" />
      {statusLabel(t, status)}
    </span>
  );
}
