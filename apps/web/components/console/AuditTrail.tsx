import type { AuditTrailRow } from "@helix/db";
import { Icon, type IconName } from "@/components/Icon";
import { formatRelativeTime } from "@/lib/console";
import type { Dict } from "@/lib/i18n";

// The immutable audit trail, made visible — the trust centerpiece. Rendered as an
// append-only ledger: each entry carries an actor glyph (agent / user / system),
// the action, the encounter it targeted, and, for agent runs, the model + prompt
// version that produced the decision. A lock seal states the contract: entries are
// appended, never edited or deleted. PHI-free by contract — kept so here.
//
// Locale note: action strings + metadata KEYS are canonical machine identifiers
// from the audit log (they must match what was recorded) — they stay verbatim.
// The chrome around them localizes.

const ACTOR_GLYPH: Record<AuditTrailRow["actorType"], IconName> = {
  agent: "pulse",
  user: "users",
  system: "gauge",
};

function actorLabel(t: Dict["console"], actorType: AuditTrailRow["actorType"]): string {
  switch (actorType) {
    case "agent":
      return t.actorAgent;
    case "user":
      return t.actorUser;
    case "system":
      return t.actorSystem;
  }
}

const META_LABEL: Record<string, string> = {
  status: "status",
  confidence: "confidence",
  serviceCode: "service",
  gapCount: "gaps",
  docsMissing: "docs missing",
  missingCount: "missing",
  decision: "decision",
  reason: "reason",
  payer: "payer",
};

const MAX_CHIPS = 4;

function actionTone(action: string): "ok" | "danger" | "none" {
  if (/approved/.test(action)) return "ok";
  if (/(rejected|denied|denial)/.test(action)) return "danger";
  return "none";
}

// Only render primitive metadata as chips — never nested objects, never anything
// that could carry PHI. Confidence is shown as a percentage.
function metaChips(
  meta: Record<string, unknown> | null,
): { key: string; label: string; value: string }[] {
  if (!meta) return [];
  const chips: { key: string; label: string; value: string }[] = [];
  for (const [key, raw] of Object.entries(meta)) {
    if (chips.length >= MAX_CHIPS) break;
    if (raw === null || typeof raw === "object" || typeof raw === "undefined") {
      continue;
    }
    const value =
      key === "confidence" && typeof raw === "number"
        ? `${Math.round(raw * 100)}%`
        : String(raw);
    chips.push({ key, label: META_LABEL[key] ?? key, value });
  }
  return chips;
}

// Long persisted ids (uuid) collapse to a short mono reference; synthetic ledger
// ids (aud_1051) are already short and pass through unchanged.
function shortRef(id: string): string {
  return id.length > 12 ? id.slice(0, 8) : id;
}

export function AuditTrail({
  rows,
  now,
  t,
}: {
  rows: AuditTrailRow[];
  now?: number;
  t: Dict["console"];
}) {
  return (
    <div className="ledger-wrap">
      <div className="ledger-seal">
        <span className="ledger-seal__lock" aria-hidden="true">
          <Icon name="lock" size={13} />
        </span>
        <span className="ledger-seal__label">{t.ledgerSeal}</span>
        <span className="ledger-seal__note">{t.ledgerSealNote}</span>
        <span className="ledger-seal__count mono">{t.ledgerEntries(rows.length)}</span>
      </div>

      {rows.length === 0 ? (
        <p className="panel-empty">{t.ledgerEmpty}</p>
      ) : (
        <ol className="ledger">
          {rows.map((row) => {
            const chips = metaChips(row.metadata);
            const tone = actionTone(row.action);
            return (
              <li key={row.id} className="ledger__row" data-actor={row.actorType}>
                <span className="ledger__glyph" aria-hidden="true">
                  <Icon name={ACTOR_GLYPH[row.actorType]} size={13} />
                </span>

                <div className="ledger__body">
                  <div className="ledger__head">
                    <span
                      className={`ledger__action mono${
                        tone === "none" ? "" : ` ledger__action--${tone}`
                      }`}
                    >
                      {row.action}
                    </span>
                    {row.encounterId ? (
                      <span className="ledger__target mono">
                        {row.encounterId}
                      </span>
                    ) : null}
                    <span className="ledger__actor mono">
                      <span className="sr-only">
                        {actorLabel(t, row.actorType)}:{" "}
                      </span>
                      {row.actorId}
                    </span>
                  </div>

                  <div className="ledger__detail">
                    <span className="ledger__ref mono">{shortRef(row.id)}</span>
                    {row.actorType === "agent" && row.model ? (
                      <span className="ledger__model mono">
                        <Icon name="pulse" size={11} />
                        {row.model}
                        {row.promptVersion ? ` · ${row.promptVersion}` : ""}
                      </span>
                    ) : null}
                    {chips.map((chip) => (
                      <span key={chip.key} className="meta-chip mono">
                        <span className="meta-chip__k">{chip.label}</span>
                        {chip.value}
                      </span>
                    ))}
                  </div>
                </div>

                <time
                  className="ledger__time mono"
                  dateTime={row.at}
                  title={new Date(row.at).toLocaleString("en-PH")}
                >
                  {formatRelativeTime(row.at, now, t)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
