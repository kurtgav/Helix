import type { ReactNode, SelectHTMLAttributes, InputHTMLAttributes } from "react";
import { useId } from "react";

interface FieldShellProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: (controlProps: {
    id: string;
    className: string;
    required: boolean | undefined;
    "aria-required": boolean | undefined;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
  }) => ReactNode;
}

/**
 * Accessible field wrapper: associates label, hint, and error via ids and
 * aria-describedby / aria-invalid. Render-prop passes wiring to the control.
 */
export function Field({ label, required, hint, error, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`field${error ? " field--invalid" : ""}`}>
      <label className="field__label" htmlFor={id}>
        {label}
        {required ? <span className="field__req" aria-hidden="true">*</span> : null}
      </label>
      {children({
        id,
        className: "field__control",
        // The visual asterisk is aria-hidden, so the required state must reach
        // the control itself: native `required` + `aria-required` announce it to
        // assistive tech even though the form uses noValidate + custom errors.
        required: required || undefined,
        "aria-required": required || undefined,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint ? (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="field__error" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

type TextFieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">;

export function TextField({ label, required, hint, error, ...input }: TextFieldProps) {
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      {(controlProps) => <input {...controlProps} {...input} />}
    </Field>
  );
}

type SelectFieldProps = {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "className">;

export function SelectField({
  label,
  required,
  hint,
  error,
  children,
  ...select
}: SelectFieldProps) {
  return (
    <Field label={label} required={required} hint={hint} error={error}>
      {(controlProps) => (
        <select {...controlProps} {...select}>
          {children}
        </select>
      )}
    </Field>
  );
}
