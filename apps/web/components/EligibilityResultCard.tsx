"use client";

import { useState } from "react";
import type { Requirement, Evidence } from "@helix/shared";
import type {
  VerifyProposalView,
  ApiResponse,
  ApproveResultView,
} from "@/lib/api-types";
import { DICTS, type Dict, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/Icon";

// Signal glyph for newly-added sprite symbols (peso/clock/quote/…), mirroring
// <Icon/> without touching its typed name union.
function Sig({ id, size = 15 }: { id: string; size?: number }) {
  return (
    <svg
      className="ico"
      style={{ width: size, height: size }}
      aria-hidden="true"
      focusable="false"
    >
      <use href={`#i-${id}`} />
    </svg>
  );
}

type ResultDict = Dict["result"];

const STATUS_ICON: Record<string, IconName> = {
  eligible: "check",
  needs_review: "alert",
  ineligible: "alert",
};

function statusLabel(t: ResultDict, status: string): string {
  if (status === "eligible") return t.statusEligible;
  if (status === "needs_review") return t.statusNeedsReview;
  if (status === "ineligible") return t.statusIneligible;
  return status;
}

function statusLede(t: ResultDict, status: string): string {
  if (status === "eligible") return t.ledeEligible;
  if (status === "needs_review") return t.ledeNeedsReview;
  if (status === "ineligible") return t.ledeIneligible;
  return "";
}

interface Props {
  proposal: VerifyProposalView;
  /** Request locale (serializable — template functions stay client-side). */
  locale: Locale;
}

export function EligibilityResultCard({ proposal, locale }: Props) {
  const t = DICTS[locale].result;
  const { eligibility } = proposal;
  const [loaBody, setLoaBody] = useState(proposal.loaDraft?.body ?? "");
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<ApproveResultView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const blockingGaps = eligibility.gaps.filter((g) => g.blocking);
  const noteGaps = eligibility.gaps.filter((g) => !g.blocking);
  const status = eligibility.status;
  const decided = outcome !== null;
  const confidencePct = Math.round(proposal.confidence * 100);

  async function decide(decision: "approved" | "rejected") {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          encounterId: proposal.encounterId,
          editedLoaBody:
            proposal.loaDraft && loaBody !== proposal.loaDraft.body
              ? loaBody
              : undefined,
        }),
      });
      const json = (await res.json()) as ApiResponse<ApproveResultView>;
      if (!json.success) {
        setError(json.error);
        return;
      }
      setOutcome(json.data);
    } catch {
      setError(t.networkError);
    } finally {
      setPending(false);
    }
  }

  const loaEdited =
    proposal.loaDraft != null && loaBody !== proposal.loaDraft.body;

  return (
    <article className={`erc erc--${status}`} aria-label={t.ariaLabel}>
      {/* Semantic status banner — the decision headline */}
      <header className="erc__banner">
        <span className="erc__banner-ic" aria-hidden="true">
          <Icon name={STATUS_ICON[status] ?? "shield"} />
        </span>
        <div className="erc__banner-main">
          <span className="erc__banner-eyebrow">{t.eyebrow}</span>
          <h2 className="erc__banner-status">{statusLabel(t, status)}</h2>
          <span className="erc__banner-lede">{statusLede(t, status)}</span>
        </div>
        <div className="erc__banner-benefit">
          <span className="erc__banner-benefit-k">{t.benefit}</span>
          <span className="erc__banner-benefit-v">
            {eligibility.benefit ?? t.noBenefit}
          </span>
        </div>
      </header>

      <div className="erc__body">
        {/* Blocking gaps — most urgent, surfaced first, in red */}
        {blockingGaps.length > 0 ? (
          <section className="erc__block">
            <div className="erc__block-head">
              <Icon name="alert" size={16} />
              {t.blockingGaps(blockingGaps.length)}
            </div>
            <ul className="erc__block-list">
              {blockingGaps.map((gap, i) => (
                <li key={i}>{gap.message}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <RequirementsSection requirements={eligibility.requirements} t={t} />

        {noteGaps.length > 0 ? (
          <section className="erc__sec">
            <h3 className="erc__sec-title">{t.notes}</h3>
            <ul className="erc__notes">
              {noteGaps.map((gap, i) => (
                <li key={i} className="erc__note">
                  <Icon name="alert" size={14} />
                  <span>{gap.message}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {proposal.loaDraft ? (
          <section className="erc__sec">
            <div className="erc__doc-bar">
              <h3 className="erc__sec-title erc__sec-title--flush">{t.loaTitle}</h3>
              {proposal.loaRequired ? (
                <span className="erc__req-tag">{t.loaRequired}</span>
              ) : null}
              <span className="erc__doc-edit">
                <Sig id="pencil" size={12} />
                {loaEdited ? t.loaEdited : t.loaEditable}
              </span>
            </div>
            <div className={`erc__doc${decided ? " erc__doc--locked" : ""}`}>
              <div className="erc__doc-head" aria-hidden="true">
                <span className="erc__doc-dot" />
                <span className="erc__doc-dot" />
                <span className="erc__doc-dot" />
                <span className="erc__doc-name">{t.loaDocName}</span>
              </div>
              <textarea
                id="loa-body"
                className="erc__doc-area"
                value={loaBody}
                disabled={decided}
                onChange={(e) => setLoaBody(e.target.value)}
                aria-label={t.loaAria}
                spellCheck={false}
              />
            </div>
            <DocLists
              required={proposal.loaDraft.requiredDocs}
              missing={proposal.loaDraft.missingDocs}
              t={t}
            />
          </section>
        ) : null}

        <EvidenceSection
          evidence={eligibility.evidence}
          rationale={proposal.rationale}
          t={t}
        />

        {/* Confidence — data as design */}
        <section className="erc__sec erc__conf">
          <div className="erc__conf-row">
            <span className="erc__conf-k">
              <Icon name="gauge" size={14} /> {t.confidence}
            </span>
            <span className="erc__conf-v mono">{confidencePct}%</span>
          </div>
          <div
            className="erc__meter"
            role="meter"
            aria-valuenow={confidencePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t.confidence}
          >
            <span className="erc__meter-fill" style={{ width: `${confidencePct}%` }} />
          </div>
          <p className="erc__conf-note">{t.confidenceNote}</p>
        </section>
      </div>

      {/* Decision bar */}
      <footer className="erc__decide">
        {error ? (
          <p className="erc__result erc__result--danger" role="alert">
            <Icon name="alert" size={16} />
            {error}
          </p>
        ) : null}

        {decided ? (
          <div
            className={`erc__result erc__result--${
              outcome!.decision === "approved" ? "ok" : "danger"
            }`}
            role="status"
          >
            <Icon name={outcome!.decision === "approved" ? "check" : "alert"} size={16} />
            {outcome!.decision === "approved" ? t.approvedMsg : t.rejectedMsg}
          </div>
        ) : (
          <>
            <div className="erc__decide-actions">
              <Button
                variant="primary"
                disabled={pending}
                onClick={() => decide("approved")}
              >
                {pending ? (
                  <>
                    <span className="vx-spin" aria-hidden="true" /> {t.recording}
                  </>
                ) : (
                  <>
                    <Icon name="check" size={16} /> {t.approve}
                  </>
                )}
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() => decide("rejected")}
              >
                {t.reject}
              </Button>
            </div>
            <span className="erc__decide-note">
              <Icon name="fingerprint" size={13} />
              {t.decideNote}
            </span>
          </>
        )}
      </footer>
    </article>
  );
}

function RequirementsSection({
  requirements,
  t,
}: {
  requirements: Requirement[];
  t: ResultDict;
}) {
  if (requirements.length === 0) return null;
  return (
    <section className="erc__sec">
      <h3 className="erc__sec-title">{t.requirements}</h3>
      <ul className="erc__reqs">
        {requirements.map((req, i) => {
          const state = !req.required ? "opt" : req.present ? "yes" : "no";
          const flag =
            state === "yes" ? t.reqProvided : state === "no" ? t.reqNeeded : t.reqOptional;
          return (
            <li key={`${req.type}-${i}`} className={`erc__req erc__req--${state}`}>
              <span className="erc__req-ic" aria-hidden="true">
                {state === "yes" ? (
                  <Icon name="check" size={13} />
                ) : state === "no" ? (
                  <Icon name="alert" size={13} />
                ) : (
                  <span className="erc__req-dash" />
                )}
              </span>
              <span className="erc__req-body">
                <span className="erc__req-label">{req.label}</span>
                {req.note ? <span className="erc__req-note">{req.note}</span> : null}
              </span>
              <span className="erc__req-flag">{flag}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DocLists({
  required,
  missing,
  t,
}: {
  required: string[];
  missing: string[];
  t: ResultDict;
}) {
  if (required.length === 0 && missing.length === 0) return null;
  return (
    <div className="erc__docs">
      {required.length > 0 ? (
        <div className="erc__docs-col">
          <p className="erc__docs-k">{t.requiredDocs}</p>
          <div className="erc__chiprow">
            {required.map((d) => (
              <span key={d} className="erc__docchip">
                <Icon name="doc" size={12} />
                {d}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {missing.length > 0 ? (
        <div className="erc__docs-col">
          <p className="erc__docs-k erc__docs-k--danger">{t.missingDocs}</p>
          <div className="erc__chiprow">
            {missing.map((d) => (
              <span key={d} className="erc__docchip erc__docchip--danger">
                <Icon name="alert" size={12} />
                {d}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EvidenceSection({
  evidence,
  rationale,
  t,
}: {
  evidence: Evidence[];
  rationale: string;
  t: ResultDict;
}) {
  return (
    <section className="erc__sec">
      <h3 className="erc__sec-title">
        <Sig id="link" size={14} /> {t.evidenceTitle}
      </h3>
      {rationale ? <p className="erc__rationale">{rationale}</p> : null}
      {evidence.length > 0 ? (
        <ul className="erc__evidence">
          {evidence.map((ev, i) => (
            <li key={`${ev.source}-${i}`} className="erc__ev">
              <span className="erc__ev-src mono">
                {ev.source} · {ev.ref}
              </span>
              {ev.snippet ? <span className="erc__ev-snip">{ev.snippet}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="erc__muted">{t.noCitations}</p>
      )}
    </section>
  );
}
