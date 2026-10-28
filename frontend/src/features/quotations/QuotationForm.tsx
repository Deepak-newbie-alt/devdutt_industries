import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { ApiError } from "../../api/client";
import type { QuotationInput } from "../../api/staffQuotations";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { formatPrice } from "../../utils/format";
import { calculateTotals, paiseToAmount, type TaxMode } from "../../utils/money";
import { ItemsEditor } from "./ItemsEditor";
import { PairsEditor } from "./PairsEditor";
import {
  LIMITS,
  serverFieldPath,
  todayInIndia,
  toInput,
  validate,
  type FormErrors,
  type QuotationFormState,
} from "./quotationFormState";

type QuotationFormProps = {
  initial: QuotationFormState;
  submitLabel: string;
  savingLabel: string;
  onSubmit: (input: QuotationInput) => Promise<void>;
  onCancel: () => void;
};

type TextField = "buyerName" | "companyName" | "address" | "gstNumber" | "mobileNumber" | "email" | "productName";

export function QuotationForm({ initial, submitLabel, savingLabel, onSubmit, onCancel }: QuotationFormProps) {
  const [state, setState] = useState(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof QuotationFormState>(key: K, value: QuotationFormState[K]) => {
    setState((current) => ({ ...current, [key]: value }));
    // Editing a field clears its message (and its rows' messages, for lists).
    // Switching GST type clears the rate messages.
    const cleared: string[] = key === "taxMode" ? ["cgstRate", "sgstRate", "igstRate"] : [key];
    setErrors((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([path]) => !cleared.some((field) => path === field || path.startsWith(`${field}.`))),
      );
      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  };
  const totals = calculateTotals(state);

  const text = (field: TextField, label: string, options: { max?: number; optional?: boolean; type?: string; multiline?: boolean; hint?: ReactNode } = {}) => {
    const id = `q-${field}`;
    const error = errors[field];
    const describedBy = [options.hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
    const common = {
      id,
      className: options.multiline ? "input textarea textarea--short" : "input",
      value: state[field],
      maxLength: options.max,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": describedBy,
    } as const;

    return (
      <div className="field">
        <label htmlFor={id} className="field__label">
          {label} {options.optional && <span className="muted">(optional)</span>}
        </label>
        {options.hint && (
          <p id={`${id}-hint`} className="field__hint">
            {options.hint}
          </p>
        )}
        {options.multiline ? (
          <textarea {...common} onChange={(event) => set(field, event.target.value)} />
        ) : (
          <input {...common} type={options.type ?? "text"} onChange={(event) => set(field, event.target.value)} />
        )}
        {error && (
          <p id={`${id}-error`} className="field__error">
            {error}
          </p>
        )}
      </div>
    );
  };

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const found = validate(state);
    setErrors(found);
    setSubmitError(null);

    if (Object.keys(found).length > 0) {
      summaryRef.current?.focus();
      return;
    }

    setSaving(true);

    try {
      await onSubmit(toInput(state));
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : new ApiError("Something went wrong. Please try again.", null);

      if (error.fieldErrors.length > 0) {
        setErrors(Object.fromEntries(error.fieldErrors.map((field) => [serverFieldPath(field.field), field.message])));
      }

      setSubmitError(error.message);
      summaryRef.current?.focus();
    } finally {
      setSaving(false);
    }
  }

  const errorCount = Object.keys(errors).length;

  return (
    <form className="quotation-form" onSubmit={submit} noValidate>
      <div ref={summaryRef} tabIndex={-1} className="quotation-form__summary">
        {(errorCount > 0 || submitError) && (
          <StatusMessage tone="error" title={submitError ?? "Please check the highlighted fields"}>
            {errorCount > 0 && <p>{errorCount === 1 ? "1 field needs attention." : `${errorCount} fields need attention.`}</p>}
          </StatusMessage>
        )}
      </div>

      <fieldset className="form-section" disabled={saving}>
        <legend className="form-section__title">Buyer</legend>
        <div className="form-grid">
          {text("buyerName", "Buyer name", { max: LIMITS.buyerName })}
          {text("companyName", "Company name", { max: LIMITS.companyName, optional: true })}
          {text("gstNumber", "GST number", { max: LIMITS.gstNumber, hint: "The buyer's GSTIN, as printed on the quotation." })}
          {text("mobileNumber", "Mobile number", { max: 15, type: "tel" })}
          {text("email", "Email", { max: LIMITS.email, optional: true, type: "email" })}
        </div>
        {text("address", "Address", { multiline: true })}
      </fieldset>

      <fieldset className="form-section" disabled={saving}>
        <legend className="form-section__title">Machine</legend>
        {text("productName", "Machine name", { max: LIMITS.productName })}
      </fieldset>

      <PairsEditor
        field="specs"
        legend="Specifications"
        rows={state.specs}
        errors={errors}
        disabled={saving}
        labelPlaceholder="e.g. Pipe outer diameter"
        onChange={(rows) => set("specs", rows)}
      />

      <ItemsEditor rows={state.items} errors={errors} disabled={saving} onChange={(rows) => set("items", rows)} />

      <fieldset className="form-section" disabled={saving}>
        <legend className="form-section__title">GST</legend>
        <div className="choice-row" role="radiogroup" aria-label="GST type">
          {(
            [
              ["intra", "Within the state (CGST + SGST)"],
              ["inter", "Between states (IGST)"],
              ["none", "No GST"],
            ] as [TaxMode, string][]
          ).map(([mode, label]) => (
            <label key={mode}>
              <input type="radio" name="tax-mode" checked={state.taxMode === mode} onChange={() => set("taxMode", mode)} /> {label}
            </label>
          ))}
        </div>
        <div className="form-grid form-grid--narrow">
          {state.taxMode === "intra" && (
            <>
              <RateField id="cgstRate" label="CGST rate (%)" value={state.cgstRate} error={errors.cgstRate} onChange={(value) => set("cgstRate", value)} />
              <RateField id="sgstRate" label="SGST rate (%)" value={state.sgstRate} error={errors.sgstRate} onChange={(value) => set("sgstRate", value)} />
            </>
          )}
          {state.taxMode === "inter" && (
            <RateField id="igstRate" label="IGST rate (%)" value={state.igstRate} error={errors.igstRate} onChange={(value) => set("igstRate", value)} />
          )}
        </div>
      </fieldset>

      <fieldset className="form-section" disabled={saving}>
        <legend className="form-section__title">Validity</legend>
        <div className="field">
          <label htmlFor="q-validUntil" className="field__label">
            Valid until
          </label>
          <input
            id="q-validUntil"
            className="input input--date"
            type="date"
            min={todayInIndia()}
            value={state.validUntil}
            aria-invalid={errors.validUntil ? true : undefined}
            onChange={(event) => set("validUntil", event.target.value)}
          />
          {errors.validUntil && <p className="field__error">{errors.validUntil}</p>}
        </div>
      </fieldset>

      <PairsEditor
        field="terms"
        legend="Terms and conditions"
        rows={state.terms}
        errors={errors}
        disabled={saving}
        labelPlaceholder="e.g. Payment"
        multilineValues
        onChange={(rows) => set("terms", rows)}
      />

      <section className="totals" aria-label="Totals" aria-live="polite">
        {totals ? (
          <dl>
            <div>
              <dt>Taxable amount</dt>
              <dd>{formatPrice(paiseToAmount(totals.taxable))}</dd>
            </div>
            {totals.cgst !== null && (
              <div>
                <dt>CGST ({state.cgstRate}%)</dt>
                <dd>{formatPrice(paiseToAmount(totals.cgst))}</dd>
              </div>
            )}
            {totals.sgst !== null && (
              <div>
                <dt>SGST ({state.sgstRate}%)</dt>
                <dd>{formatPrice(paiseToAmount(totals.sgst))}</dd>
              </div>
            )}
            {totals.igst !== null && (
              <div>
                <dt>IGST ({state.igstRate}%)</dt>
                <dd>{formatPrice(paiseToAmount(totals.igst))}</dd>
              </div>
            )}
            <div className="totals__grand">
              <dt>Grand total</dt>
              <dd>{formatPrice(paiseToAmount(totals.grandTotal))}</dd>
            </div>
          </dl>
        ) : (
          <p className="muted">Totals appear once every quantity, price and rate is filled in.</p>
        )}
        <p className="totals__note muted">The server recalculates these totals when you save.</p>
      </section>

      <div className="form-actions">
        <button type="submit" className="button button--accent" disabled={saving}>
          {saving ? savingLabel : submitLabel}
        </button>
        <button type="button" className="button button--secondary" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function RateField({ id, label, value, error, onChange }: { id: string; label: string; value: string; error?: string; onChange: (value: string) => void }) {
  return (
    <div className="field">
      <label htmlFor={`q-${id}`} className="field__label">
        {label}
      </label>
      <input
        id={`q-${id}`}
        className="input"
        inputMode="decimal"
        placeholder="e.g. 9"
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}
