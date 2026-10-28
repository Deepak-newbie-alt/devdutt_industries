import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ApiError } from "../../api/client";
import { createSalesperson, serverFieldErrors, type NewSalespersonInput } from "../../api/admin";
import { useEmployee } from "../../auth/EmployeeContext";
import { FormField } from "../../components/ui/FormField";
import { StatusMessage } from "../../components/ui/StatusMessage";

// Limits follow the backend validator and the database columns.
const LIMITS = { name: 100, email: 255, phone: 20, password: 128 } as const;
const MIN_PASSWORD = 8;

type Errors = Partial<Record<keyof NewSalespersonInput, string>>;

function validate(values: NewSalespersonInput): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Enter their name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Enter a valid email address.";
  if (!values.phone.trim()) errors.phone = "Enter their phone number.";
  if (values.password.trim().length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  return errors;
}

export function NewStaffPage() {
  const { request } = useEmployee();
  const navigate = useNavigate();
  const [values, setValues] = useState<NewSalespersonInput>({ name: "", email: "", phone: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const set = (key: keyof NewSalespersonInput, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    const found = validate(values);
    setErrors(found);
    setSubmitError(null);

    if (Object.values(found).some(Boolean)) {
      summaryRef.current?.focus();
      return;
    }

    setSaving(true);

    try {
      const created = await createSalesperson(request, {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
      });
      navigate(`/app/staff/${created.id}`, { state: { created: true } });
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : new ApiError("Something went wrong. Please try again.", null);
      setErrors(serverFieldErrors(error.fieldErrors));
      setSubmitError(error.message);
      summaryRef.current?.focus();
      setSaving(false);
    }
  }

  return (
    <div className="container page-section narrow">
      <title>Add salesperson | Devdutt Industries Staff</title>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/app/staff">Staff</Link>
          </li>
          <li aria-current="page">Add salesperson</li>
        </ol>
      </nav>
      <h1>Add salesperson</h1>
      <p className="muted">This creates their sign-in account and a salesperson profile. You can make them an admin afterwards.</p>

      <form onSubmit={submit} noValidate>
        <div ref={summaryRef} tabIndex={-1} className="quotation-form__summary">
          {submitError && (
            <StatusMessage tone="error" title="The salesperson wasn't added">
              <p>{submitError}</p>
            </StatusMessage>
          )}
        </div>

        <fieldset className="form-section" disabled={saving}>
          <legend className="form-section__title">Details</legend>
          <FormField id="staff-name" label="Full name" error={errors.name}>
            {(a11y) => (
              <input id="staff-name" className="input" autoComplete="off" maxLength={LIMITS.name} value={values.name} onChange={(e) => set("name", e.target.value)} {...a11y} />
            )}
          </FormField>
          <FormField id="staff-email" label="Email" hint="They sign in with this address." error={errors.email}>
            {(a11y) => (
              <input id="staff-email" className="input" type="email" autoComplete="off" maxLength={LIMITS.email} value={values.email} onChange={(e) => set("email", e.target.value)} {...a11y} />
            )}
          </FormField>
          <FormField id="staff-phone" label="Phone" error={errors.phone}>
            {(a11y) => (
              <input id="staff-phone" className="input" type="tel" autoComplete="off" maxLength={LIMITS.phone} value={values.phone} onChange={(e) => set("phone", e.target.value)} {...a11y} />
            )}
          </FormField>
          <FormField
            id="staff-password"
            label="First password"
            hint="At least 8 characters. The sign-in service may ask for a longer or stronger one; if so, its reason is shown here. Share the password with them privately."
            error={errors.password}
          >
            {(a11y) => (
              <input
                id="staff-password"
                className="input"
                type="password"
                autoComplete="new-password"
                maxLength={LIMITS.password}
                value={values.password}
                onChange={(e) => set("password", e.target.value)}
                {...a11y}
              />
            )}
          </FormField>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="button button--accent" disabled={saving}>
            {saving ? "Adding…" : "Add salesperson"}
          </button>
          <Link to="/app/staff" className="button button--secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
