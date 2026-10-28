import type { ReactNode } from "react";

type FieldA11y = {
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
};

type FormFieldProps = {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  // Renders the control; spread the given attributes onto it so the hint and error are announced.
  children: (a11y: FieldA11y) => ReactNode;
};

// A labelled form control with an optional hint and error message.
export function FormField({ id, label, hint, error, optional, children }: FormFieldProps) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field">
      <label htmlFor={id} className="field__label">
        {label} {optional && <span className="muted">(optional)</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {children({ "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error && (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
