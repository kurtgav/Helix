"use client";

import { useState, type FormEvent } from "react";
import { intakeInputSchema, type IntakeInput } from "@helix/shared";
import type { PayerOption, ServiceOption } from "@/lib/demo";
import type { VerifyProposalView, ApiResponse } from "@/lib/api-types";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField, SelectField } from "@/components/ui/Field";
import { EligibilityResultCard } from "@/components/EligibilityResultCard";

interface Props {
  payers: readonly PayerOption[];
  services: readonly ServiceOption[];
}

type FieldErrors = Partial<Record<string, string>>;

interface FormState {
  fullName: string;
  birthDate: string;
  sex: string;
  payerId: string;
  memberId: string;
  planName: string;
  serviceCode: string;
}

const EMPTY: FormState = {
  fullName: "",
  birthDate: "",
  sex: "",
  payerId: "",
  memberId: "",
  planName: "",
  serviceCode: "",
};

// Map an intake schema issue path to a flat form field key.
function keyForPath(path: (string | number)[]): string {
  const last = path[path.length - 1];
  if (path[0] === "service") return "serviceCode";
  return typeof last === "string" ? last : "form";
}

export function VerifyExperience({ payers, services }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<VerifyProposalView | null>(null);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildIntake(): unknown {
    const service = services.find((s) => s.code === form.serviceCode);
    return {
      patient: {
        fullName: form.fullName.trim(),
        birthDate: form.birthDate,
        sex: form.sex,
      },
      coverage: {
        payerId: form.payerId,
        memberId: form.memberId.trim(),
        planName: form.planName.trim(),
      },
      service: service
        ? { code: service.code, name: service.name, category: service.category }
        : { code: "", name: "", category: "other" },
    };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const parsed = intakeInputSchema.safeParse(buildIntake());
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = keyForPath(issue.path);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    setProposal(null);

    try {
      const input: IntakeInput = parsed.data;
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as ApiResponse<VerifyProposalView>;
      if (!json.success) {
        setSubmitError(json.error);
        return;
      }
      setProposal(json.data);
    } catch {
      setSubmitError("Network error. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="verify-grid">
      <Card>
        <CardBody>
          <form onSubmit={onSubmit} noValidate>
            <fieldset className="form-section" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="form-section__legend eyebrow">Patient</legend>
              <TextField
                label="Full name"
                required
                autoComplete="off"
                placeholder="Juan Dela Cruz"
                value={form.fullName}
                error={errors.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
              <div className="form-row">
                <TextField
                  label="Birth date"
                  required
                  type="date"
                  value={form.birthDate}
                  error={errors.birthDate}
                  onChange={(e) => set("birthDate", e.target.value)}
                />
                <SelectField
                  label="Sex"
                  required
                  value={form.sex}
                  error={errors.sex}
                  onChange={(e) => set("sex", e.target.value)}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                  <option value="X">Other</option>
                </SelectField>
              </div>
            </fieldset>

            <fieldset
              className="form-section"
              style={{ border: 0, padding: 0, margin: "var(--sp-5) 0 0" }}
            >
              <legend className="form-section__legend eyebrow">Coverage</legend>
              <SelectField
                label="Payer"
                required
                value={form.payerId}
                error={errors.payerId}
                onChange={(e) => set("payerId", e.target.value)}
              >
                <option value="" disabled>
                  Select payer…
                </option>
                {payers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectField>
              <div className="form-row">
                <TextField
                  label="Member ID"
                  required
                  placeholder="MX-000123456"
                  value={form.memberId}
                  error={errors.memberId}
                  onChange={(e) => set("memberId", e.target.value)}
                />
                <TextField
                  label="Plan"
                  required
                  placeholder="Prime Gold"
                  value={form.planName}
                  error={errors.planName}
                  onChange={(e) => set("planName", e.target.value)}
                />
              </div>
            </fieldset>

            <fieldset
              className="form-section"
              style={{ border: 0, padding: 0, margin: "var(--sp-5) 0 0" }}
            >
              <legend className="form-section__legend eyebrow">Service</legend>
              <SelectField
                label="Requested service"
                required
                value={form.serviceCode}
                error={errors.serviceCode}
                onChange={(e) => set("serviceCode", e.target.value)}
              >
                <option value="" disabled>
                  Select service…
                </option>
                {services.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </SelectField>
            </fieldset>

            {submitError ? (
              <p className="form-alert" role="alert" style={{ marginTop: "var(--sp-5)" }}>
                {submitError}
              </p>
            ) : null}

            <div style={{ marginTop: "var(--sp-5)" }}>
              <Button type="submit" variant="primary" size="lg" block disabled={loading}>
                {loading ? "Verifying…" : "Verify"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div aria-live="polite">
        {proposal ? (
          <EligibilityResultCard proposal={proposal} />
        ) : (
          <div className="result-empty">
            <div>
              <p style={{ fontWeight: "var(--fw-semibold)", color: "var(--c-ink-2)" }}>
                Fill the intake and click Verify
              </p>
              <p style={{ fontSize: "var(--fs-sm)", marginTop: "var(--sp-2)" }}>
                Helix returns eligibility, LOA needs, missing docs, and a drafted
                letter — each with cited evidence.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
