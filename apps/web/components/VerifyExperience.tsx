"use client";

import { useState, type FormEvent } from "react";
import { intakeInputSchema, type IntakeInput } from "@helix/shared";
import type { PayerOption, ServiceOption } from "@/lib/demo";
import type { VerifyProposalView, ApiResponse } from "@/lib/api-types";
import { DICTS, type Locale } from "@/lib/i18n";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField, SelectField } from "@/components/ui/Field";
import { Icon } from "@/components/Icon";
import { EligibilityResultCard } from "@/components/EligibilityResultCard";

// Signal glyph — references a sprite symbol by id (mirrors <Icon/> but not bound
// to its typed name union, so newly-added sprite symbols like "spark" work here
// without editing the shared Icon component).
function Sig({ id, size = 16 }: { id: string; size?: number }) {
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

interface Props {
  payers: readonly PayerOption[];
  services: readonly ServiceOption[];
  /** Request locale from the server page. Dictionaries contain template
   *  FUNCTIONS, which cannot cross the server→client prop boundary — so the
   *  serializable locale crosses instead and the dict is picked client-side. */
  locale: Locale;
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

export function VerifyExperience({ payers, services, locale }: Props) {
  const t = DICTS[locale].verify;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<VerifyProposalView | null>(null);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Effortless demo: drop in a valid synthetic walk-in (Maxicare · MRI, matching
  // the landing thesis). Client-only — this never touches the API contract.
  function loadSample() {
    setForm({
      fullName: "Juan Dela Cruz",
      birthDate: "1990-04-12",
      sex: "M",
      payerId: payers[0]?.id ?? "",
      memberId: "MX-0244163",
      planName: "Prima Gold",
      serviceCode: services[0]?.code ?? "",
    });
    setErrors({});
    setSubmitError(null);
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
      setSubmitError(t.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="vx-grid">
      <div className="vx-formcol">
        <Card>
          <CardBody>
            <form onSubmit={onSubmit} noValidate className="vx-form">
              <div className="vx-form__head">
                <span className="vx-form__ic" aria-hidden="true">
                  <Icon name="shield" />
                </span>
                <div className="vx-form__heading">
                  <h2 className="vx-form__title">{t.formTitle}</h2>
                  <p className="vx-form__sub">{t.formSub}</p>
                </div>
                <button type="button" className="vx-sample" onClick={loadSample}>
                  <Sig id="spark" size={14} /> {t.sample}
                </button>
              </div>

              <fieldset className="vx-sec">
                <legend className="vx-sec__legend">
                  <span className="vx-sec__n">01</span> {t.secPatient}
                </legend>
                <TextField
                  label={t.fullName}
                  required
                  autoComplete="off"
                  placeholder="Juan Dela Cruz"
                  value={form.fullName}
                  error={errors.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                />
                <div className="form-row">
                  <TextField
                    label={t.birthDate}
                    required
                    type="date"
                    value={form.birthDate}
                    error={errors.birthDate}
                    onChange={(e) => set("birthDate", e.target.value)}
                  />
                  <SelectField
                    label={t.sex}
                    required
                    value={form.sex}
                    error={errors.sex}
                    onChange={(e) => set("sex", e.target.value)}
                  >
                    <option value="" disabled>
                      {t.sexSelect}
                    </option>
                    <option value="F">{t.sexF}</option>
                    <option value="M">{t.sexM}</option>
                    <option value="X">{t.sexX}</option>
                  </SelectField>
                </div>
              </fieldset>

              <fieldset className="vx-sec">
                <legend className="vx-sec__legend">
                  <span className="vx-sec__n">02</span> {t.secCoverage}
                </legend>
                <SelectField
                  label={t.payer}
                  required
                  value={form.payerId}
                  error={errors.payerId}
                  onChange={(e) => set("payerId", e.target.value)}
                >
                  <option value="" disabled>
                    {t.payerSelect}
                  </option>
                  {payers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </SelectField>
                <div className="form-row">
                  <TextField
                    label={t.memberId}
                    required
                    placeholder="MX-000123456"
                    value={form.memberId}
                    error={errors.memberId}
                    onChange={(e) => set("memberId", e.target.value)}
                  />
                  <TextField
                    label={t.plan}
                    required
                    placeholder="Prime Gold"
                    value={form.planName}
                    error={errors.planName}
                    onChange={(e) => set("planName", e.target.value)}
                  />
                </div>
              </fieldset>

              <fieldset className="vx-sec">
                <legend className="vx-sec__legend">
                  <span className="vx-sec__n">03</span> {t.secService}
                </legend>
                <SelectField
                  label={t.service}
                  required
                  value={form.serviceCode}
                  error={errors.serviceCode}
                  onChange={(e) => set("serviceCode", e.target.value)}
                >
                  <option value="" disabled>
                    {t.serviceSelect}
                  </option>
                  {services.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </SelectField>
              </fieldset>

              {submitError ? (
                <p className="vx-alert" role="alert">
                  <Icon name="alert" size={16} />
                  {submitError}
                </p>
              ) : null}

              <div className="vx-submit">
                <Button type="submit" variant="primary" size="lg" block disabled={loading}>
                  {loading ? (
                    <>
                      <span className="vx-spin" aria-hidden="true" /> {t.verifying}
                    </>
                  ) : (
                    <>
                      {t.submit}
                      <Icon name="arrow" size={16} />
                    </>
                  )}
                </Button>
                <p className="vx-submit__note">
                  <Icon name="lock" size={12} />
                  {t.submitNote}
                </p>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>

      <div className="vx-resultcol" aria-live="polite">
        {proposal ? (
          <EligibilityResultCard
            key={proposal.encounterId}
            proposal={proposal}
            locale={locale}
          />
        ) : (
          <div className="vx-empty">
            <span className="vx-empty__ic" aria-hidden="true">
              <Icon name="shield" />
            </span>
            <p className="vx-empty__t">{t.emptyTitle}</p>
            <p className="vx-empty__d">{t.emptyDesc}</p>
            <ul className="vx-empty__list">
              <li>
                <Icon name="check" size={14} /> {t.emptyItem1}
              </li>
              <li>
                <Icon name="check" size={14} /> {t.emptyItem2}
              </li>
              <li>
                <Icon name="check" size={14} /> {t.emptyItem3}
              </li>
              <li>
                <Icon name="check" size={14} /> {t.emptyItem4}
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
