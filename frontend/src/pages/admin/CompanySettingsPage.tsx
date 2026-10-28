import { useRef, useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import {
  createCompanySettings,
  getCompanySettings,
  serverFieldErrors,
  updateCompanySettings,
  type CompanySettingsInput,
} from "../../api/admin";
import { useEmployee } from "../../auth/EmployeeContext";
import { FormField } from "../../components/ui/FormField";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { isWebUrl } from "../../features/admin/productFormState";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { CompanySettings } from "../../types/api";
import { formatDateTime } from "../../utils/format";

type Field = keyof CompanySettingsInput;
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

// Backend validator limits; where it sets none, the database column's.
const LIMITS: Record<Exclude<Field, "defaultTermsAndConditions">, number> = {
  companyName: 200,
  addressLine1: 255,
  addressLine2: 255,
  city: 100,
  state: 100,
  postalCode: 20,
  country: 100,
  phone: 20,
  email: 255,
  website: 255,
  gstin: 15,
  logoUrl: 500,
};

const REQUIRED: Field[] = ["companyName", "addressLine1", "city", "state", "postalCode", "country", "phone"];
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

function toValues(settings: CompanySettings | null): Values {
  const text = (value: string | null | undefined) => value ?? "";
  return {
    companyName: text(settings?.companyName),
    addressLine1: text(settings?.addressLine1),
    addressLine2: text(settings?.addressLine2),
    city: text(settings?.city),
    state: text(settings?.state),
    postalCode: text(settings?.postalCode),
    country: settings ? settings.country : "India",
    phone: text(settings?.phone),
    email: text(settings?.email),
    website: text(settings?.website),
    gstin: text(settings?.gstin),
    logoUrl: text(settings?.logoUrl),
    defaultTermsAndConditions: text(settings?.defaultTermsAndConditions),
  };
}

function validate(values: Values): Errors {
  const errors: Errors = {};
  for (const field of REQUIRED) {
    if (!values[field].trim()) errors[field] = "This is required.";
  }
  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Enter a valid email address.";
  if (values.website.trim() && !isWebUrl(values.website)) errors.website = "Enter a full web address starting with http:// or https://";
  if (values.logoUrl.trim() && !isWebUrl(values.logoUrl)) errors.logoUrl = "Enter a full web address starting with http:// or https://";
  if (values.gstin.trim() && !GSTIN_PATTERN.test(values.gstin.trim().toUpperCase())) errors.gstin = "Enter a valid 15-character GSTIN.";
  return errors;
}

// Optional fields are sent as null when empty, which clears them.
function toInput(values: Values): CompanySettingsInput {
  const optional = (value: string) => (value.trim() ? value.trim() : null);
  return {
    companyName: values.companyName.trim(),
    addressLine1: values.addressLine1.trim(),
    addressLine2: optional(values.addressLine2),
    city: values.city.trim(),
    state: values.state.trim(),
    postalCode: values.postalCode.trim(),
    country: values.country.trim(),
    phone: values.phone.trim(),
    email: optional(values.email),
    website: optional(values.website),
    gstin: values.gstin.trim() ? values.gstin.trim().toUpperCase() : null,
    logoUrl: optional(values.logoUrl),
    defaultTermsAndConditions: optional(values.defaultTermsAndConditions),
  };
}

export function CompanySettingsPage() {
  const { request } = useEmployee();
  // 404 means the settings haven't been created yet: show an empty form.
  const settings = useApiQuery(
    (signal) =>
      getCompanySettings(request, signal).catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }),
    [],
  );

  if (settings.status === "loading") {
    return (
      <div className="container page-section">
        <LoadingState label="Loading company settings" />
      </div>
    );
  }

  if (settings.status === "error") {
    return (
      <div className="container page-section narrow">
        <title>Company | Devdutt Industries Staff</title>
        <LoadError title="Company settings couldn't be loaded" error={settings.error} onRetry={settings.reload} />
      </div>
    );
  }

  return <CompanyForm key={settings.data ? "existing" : "new"} existing={settings.data} onSaved={settings.reload} />;
}

function CompanyForm({ existing, onSaved }: { existing: CompanySettings | null; onSaved: () => void }) {
  const { request } = useEmployee();
  const [values, setValues] = useState<Values>(() => toValues(existing));
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const set = (key: Field, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    const found = validate(values);
    setErrors(found);
    setSubmitError(null);
    setNotice(null);

    if (Object.values(found).some(Boolean)) {
      summaryRef.current?.focus();
      return;
    }

    setSaving(true);

    try {
      if (existing) {
        await updateCompanySettings(request, toInput(values));
        setNotice("Company settings saved.");
      } else {
        await createCompanySettings(request, toInput(values));
        setNotice("Company settings created.");
      }
      onSaved();
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : new ApiError("Something went wrong. Please try again.", null);
      setErrors(serverFieldErrors(error.fieldErrors));
      setSubmitError(error.message);
    } finally {
      setSaving(false);
      summaryRef.current?.focus();
    }
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  const text = (field: Exclude<Field, "defaultTermsAndConditions">, label: string, options: { optional?: boolean; type?: string; hint?: string } = {}) => (
    <FormField id={`company-${field}`} label={label} optional={options.optional} hint={options.hint} error={errors[field]}>
      {(a11y) => (
        <input
          id={`company-${field}`}
          className="input"
          type={options.type ?? "text"}
          maxLength={LIMITS[field]}
          value={values[field]}
          onChange={(e) => set(field, e.target.value)}
          {...a11y}
        />
      )}
    </FormField>
  );

  return (
    <div className="container page-section">
      <title>Company | Devdutt Industries Staff</title>
      <header className="page-header">
        <h1>Company settings</h1>
        <p className="muted">
          {existing
            ? `Last updated ${formatDateTime(existing.updatedAt)}.`
            : "Not set up yet. The website footer, quotation PDFs and default quotation terms use these details."}
        </p>
      </header>

      <form className="quotation-form" onSubmit={submit} noValidate>
        <div ref={summaryRef} tabIndex={-1} className="quotation-form__summary">
          {notice && (
            <StatusMessage tone="success">
              <p>{notice}</p>
            </StatusMessage>
          )}
          {(errorCount > 0 || submitError) && (
            <StatusMessage tone="error" title={submitError ?? "Please check the highlighted fields"}>
              {errorCount > 0 && <p>{errorCount === 1 ? "1 field needs attention." : `${errorCount} fields need attention.`}</p>}
            </StatusMessage>
          )}
        </div>

        <fieldset className="form-section" disabled={saving}>
          <legend className="form-section__title">Company</legend>
          {text("companyName", "Company name")}
          <div className="form-grid">
            {text("gstin", "GSTIN", { optional: true, hint: "15 characters, e.g. 22AAAAA0000A1Z5" })}
            {text("logoUrl", "Logo link", { optional: true, type: "url" })}
          </div>
        </fieldset>

        <fieldset className="form-section" disabled={saving}>
          <legend className="form-section__title">Address</legend>
          {text("addressLine1", "Address line 1")}
          {text("addressLine2", "Address line 2", { optional: true })}
          <div className="form-grid">
            {text("city", "City")}
            {text("state", "State")}
            {text("postalCode", "PIN code")}
            {text("country", "Country")}
          </div>
        </fieldset>

        <fieldset className="form-section" disabled={saving}>
          <legend className="form-section__title">Contact</legend>
          <p className="muted">Shown on the public website.</p>
          <div className="form-grid">
            {text("phone", "Phone", { type: "tel" })}
            {text("email", "Email", { optional: true, type: "email" })}
            {text("website", "Website", { optional: true, type: "url" })}
          </div>
        </fieldset>

        <fieldset className="form-section" disabled={saving}>
          <legend className="form-section__title">Quotations</legend>
          <FormField
            id="company-terms"
            label="Default terms and conditions"
            optional
            hint="Pre-filled into the terms of every new quotation. Salespeople can edit them per quotation."
            error={errors.defaultTermsAndConditions}
          >
            {(a11y) => (
              <textarea
                id="company-terms"
                className="input textarea"
                value={values.defaultTermsAndConditions}
                onChange={(e) => set("defaultTermsAndConditions", e.target.value)}
                {...a11y}
              />
            )}
          </FormField>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="button button--accent" disabled={saving}>
            {saving ? "Saving…" : existing ? "Save changes" : "Create company settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
