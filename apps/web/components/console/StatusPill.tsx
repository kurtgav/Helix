import type { EncounterStatus } from "@helix/shared";

// Encounter status as SEMANTIC color, not decoration: approved reads as safe
// (green / --c-ok), awaiting as attention (amber / --c-warn), rejected as danger
// (red). Tones map to the -soft background variants defined in console.css.
type Tone = "ok" | "warn" | "danger" | "info" | "neutral" | "muted";

const STATUS_META: Record<EncounterStatus, { tone: Tone; label: string }> = {
  intake: { tone: "neutral", label: "Intake" },
  verifying: { tone: "info", label: "Verifying" },
  awaiting_approval: { tone: "warn", label: "Awaiting approval" },
  approved: { tone: "ok", label: "Approved" },
  rejected: { tone: "danger", label: "Rejected" },
  closed: { tone: "muted", label: "Closed" },
};

export function StatusPill({ status }: { status: EncounterStatus }) {
  const meta = STATUS_META[status] ?? { tone: "neutral" as Tone, label: status };
  return (
    <span className={`status-pill status-pill--${meta.tone}`}>
      <span className="status-pill__dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
