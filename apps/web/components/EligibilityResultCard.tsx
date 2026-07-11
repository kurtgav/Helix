"use client";

import { useState } from "react";
import type { Requirement, Gap, Evidence } from "@helix/shared";
import type {
  VerifyProposalView,
  ApiResponse,
  ApproveResultView,
} from "@/lib/api-types";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

const STATUS_TONE: Record<string, BadgeTone> = {
  eligible: "ok",
  needs_review: "warn",
  ineligible: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  eligible: "Eligible",
  needs_review: "Needs review",
  ineligible: "Not eligible",
};

interface Props {
  proposal: VerifyProposalView;
}

export function EligibilityResultCard({ proposal }: Props) {
  const { eligibility } = proposal;
  const [loaBody, setLoaBody] = useState(proposal.loaDraft?.body ?? "");
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<ApproveResultView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const blockingGaps = eligibility.gaps.filter((g) => g.blocking);
  const decided = outcome !== null;

  async function decide(decision: "approved" | "rejected") {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionKind: proposal.kind,
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
      setError("Network error. Please retry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card elevated>
      <CardBody>
        <div className="result-head">
          <div>
            <p className="section-title" style={{ marginBottom: "var(--sp-1)" }}>
              Eligibility result
            </p>
            {eligibility.benefit ? (
              <p className="result-benefit">{eligibility.benefit}</p>
            ) : (
              <p className="result-benefit muted">No benefit detail returned.</p>
            )}
          </div>
          <Badge tone={STATUS_TONE[eligibility.status] ?? "neutral"}>
            {STATUS_LABEL[eligibility.status] ?? eligibility.status}
          </Badge>
        </div>

        <RequirementsSection requirements={eligibility.requirements} />

        {eligibility.gaps.length > 0 ? (
          <GapsSection gaps={eligibility.gaps} blockingCount={blockingGaps.length} />
        ) : null}

        {proposal.loaDraft ? (
          <section className="section-block">
            <p className="section-title">
              Drafted Letter of Authorization {proposal.loaRequired ? "(required)" : ""}
            </p>
            <label htmlFor="loa-body" className="field__label">
              Review and edit before approving
            </label>
            <textarea
              id="loa-body"
              className="field__control"
              value={loaBody}
              disabled={decided}
              onChange={(e) => setLoaBody(e.target.value)}
              style={{ marginTop: "var(--sp-2)", width: "100%" }}
              aria-label="Editable LOA draft"
            />
            <DocLists
              required={proposal.loaDraft.requiredDocs}
              missing={proposal.loaDraft.missingDocs}
            />
          </section>
        ) : null}

        <EvidenceSection evidence={eligibility.evidence} rationale={proposal.rationale} />

        {error ? (
          <p className="decision-note decision-note--danger" role="alert">
            {error}
          </p>
        ) : null}

        {decided ? (
          <div
            className={`decision-note decision-note--${
              outcome!.decision === "approved" ? "ok" : "danger"
            }`}
            role="status"
          >
            {outcome!.decision === "approved"
              ? "Approved and logged to the audit trail. LOA marked ready."
              : "Rejected and logged. Nothing was submitted."}
          </div>
        ) : (
          <div className="decision-bar">
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => decide("approved")}
            >
              {pending ? "Recording…" : "Approve"}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => decide("rejected")}
            >
              Reject
            </Button>
            <span className="confidence" style={{ marginLeft: "auto", alignSelf: "center" }}>
              Confidence {(proposal.confidence * 100).toFixed(0)}% · human approval required
            </span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function RequirementsSection({ requirements }: { requirements: Requirement[] }) {
  if (requirements.length === 0) return null;
  return (
    <section className="section-block">
      <p className="section-title">Requirements</p>
      <ul className="checklist">
        {requirements.map((req, i) => {
          const state = !req.required ? "opt" : req.present ? "yes" : "no";
          const icon = state === "yes" ? "✓" : state === "no" ? "!" : "–";
          return (
            <li key={`${req.type}-${i}`} className="check">
              <span className={`check__icon check__icon--${state}`} aria-hidden="true">
                {icon}
              </span>
              <span className="stack">
                <span className="check__label">
                  {req.label}
                  {!req.required ? " (optional)" : ""}
                </span>
                {req.note ? <span className="check__note">{req.note}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GapsSection({
  gaps,
  blockingCount,
}: {
  gaps: Gap[];
  blockingCount: number;
}) {
  return (
    <section className="section-block">
      <p className="section-title">
        Gaps{blockingCount > 0 ? ` · ${blockingCount} blocking` : ""}
      </p>
      {gaps.map((gap, i) => (
        <div key={i} className={`gap${gap.blocking ? " gap--blocking" : ""}`}>
          <Badge tone={gap.blocking ? "danger" : "warn"}>
            {gap.blocking ? "Blocking" : "Note"}
          </Badge>
          <span className="gap__msg">{gap.message}</span>
        </div>
      ))}
    </section>
  );
}

function DocLists({ required, missing }: { required: string[]; missing: string[] }) {
  if (required.length === 0 && missing.length === 0) return null;
  return (
    <div style={{ marginTop: "var(--sp-3)", display: "flex", gap: "var(--sp-6)", flexWrap: "wrap" }}>
      {required.length > 0 ? (
        <div>
          <p className="field__hint">Required documents</p>
          <ul style={{ margin: "var(--sp-1) 0 0", paddingLeft: "var(--sp-4)" }}>
            {required.map((d) => (
              <li key={d} style={{ fontSize: "var(--fs-sm)" }}>
                {d}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {missing.length > 0 ? (
        <div>
          <p className="field__hint" style={{ color: "var(--c-danger)" }}>
            Missing
          </p>
          <ul style={{ margin: "var(--sp-1) 0 0", paddingLeft: "var(--sp-4)" }}>
            {missing.map((d) => (
              <li key={d} style={{ fontSize: "var(--fs-sm)", color: "var(--c-danger)" }}>
                {d}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function EvidenceSection({
  evidence,
  rationale,
}: {
  evidence: Evidence[];
  rationale: string;
}) {
  return (
    <section className="section-block">
      <p className="section-title">Evidence &amp; rationale</p>
      {rationale ? (
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--c-ink-2)", marginBottom: "var(--sp-3)" }}>
          {rationale}
        </p>
      ) : null}
      {evidence.length > 0 ? (
        <ul className="evidence">
          {evidence.map((ev, i) => (
            <li key={`${ev.source}-${i}`}>
              <span className="evidence__src">
                {ev.source} · {ev.ref}
              </span>
              {ev.snippet ? <div>{ev.snippet}</div> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted" style={{ fontSize: "var(--fs-sm)" }}>
          No citations returned.
        </p>
      )}
    </section>
  );
}
