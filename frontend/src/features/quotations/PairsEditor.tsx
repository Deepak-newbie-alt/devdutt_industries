import type { FormErrors, PairRow } from "./quotationFormState";
import { emptyPair } from "./quotationFormState";

type PairsEditorProps = {
  field: "specs" | "terms";
  legend: string;
  rows: PairRow[];
  errors: FormErrors;
  disabled: boolean;
  labelPlaceholder: string;
  multilineValues?: boolean;
  onChange: (rows: PairRow[]) => void;
};

// Heading/value rows, printed as a two-column table in the PDF.
export function PairsEditor({ field, legend, rows, errors, disabled, labelPlaceholder, multilineValues, onChange }: PairsEditorProps) {
  const update = (index: number, change: Partial<PairRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...change } : row)));

  return (
    <fieldset className="form-section" disabled={disabled}>
      <legend className="form-section__title">{legend}</legend>
      {errors[field] && (
        <p className="field__error" id={`${field}-error`}>
          {errors[field]}
        </p>
      )}
      <ul className="pairs">
        {rows.map((row, index) => {
          const labelError = errors[`${field}.${index}.label`];
          const valueError = errors[`${field}.${index}.value`];
          return (
            <li key={row.key} className="pairs__row">
              <div>
                <label className="visually-hidden" htmlFor={`${row.key}-label`}>
                  {legend} heading {index + 1}
                </label>
                <input
                  id={`${row.key}-label`}
                  className="input"
                  placeholder={labelPlaceholder}
                  value={row.label}
                  aria-invalid={labelError ? true : undefined}
                  onChange={(event) => update(index, { label: event.target.value })}
                />
                {labelError && <p className="field__error">{labelError}</p>}
              </div>
              <div>
                <label className="visually-hidden" htmlFor={`${row.key}-value`}>
                  {legend} value {index + 1}
                </label>
                {multilineValues ? (
                  <textarea
                    id={`${row.key}-value`}
                    className="input textarea textarea--short"
                    value={row.value}
                    aria-invalid={valueError ? true : undefined}
                    onChange={(event) => update(index, { value: event.target.value })}
                  />
                ) : (
                  <input
                    id={`${row.key}-value`}
                    className="input"
                    value={row.value}
                    aria-invalid={valueError ? true : undefined}
                    onChange={(event) => update(index, { value: event.target.value })}
                  />
                )}
                {valueError && <p className="field__error">{valueError}</p>}
              </div>
              <button
                type="button"
                className="link-button pairs__remove"
                aria-label={`Remove ${legend.toLowerCase()} row ${index + 1}`}
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" className="button button--secondary" onClick={() => onChange([...rows, emptyPair()])}>
        Add row
      </button>
    </fieldset>
  );
}
