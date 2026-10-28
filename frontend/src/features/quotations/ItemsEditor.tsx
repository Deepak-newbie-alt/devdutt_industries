import type { ProductUnit } from "../../types/api";
import { formatPrice } from "../../utils/format";
import { paiseToAmount, toPaise } from "../../utils/money";
import { emptyItem, LIMITS, type FormErrors, type ItemRow } from "./quotationFormState";

const UNITS: ProductUnit[] = ["Machine", "Set", "Piece"];

type ItemsEditorProps = {
  rows: ItemRow[];
  errors: FormErrors;
  disabled: boolean;
  onChange: (rows: ItemRow[]) => void;
};

function lineAmount(item: ItemRow) {
  const price = toPaise(item.unitPrice);
  const quantity = /^\d+$/.test(item.quantity.trim()) ? BigInt(item.quantity.trim()) : null;
  return price !== null && quantity !== null ? formatPrice(paiseToAmount(price * quantity)) : "—";
}

export function ItemsEditor({ rows, errors, disabled, onChange }: ItemsEditorProps) {
  const update = (index: number, change: Partial<ItemRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...change } : row)));

  return (
    <fieldset className="form-section" disabled={disabled}>
      <legend className="form-section__title">Items</legend>
      {errors.items && <p className="field__error">{errors.items}</p>}
      <ol className="items">
        {rows.map((item, index) => {
          const error = (field: string) => errors[`items.${index}.${field}`];
          const id = (field: string) => `${item.key}-${field}`;
          return (
            <li key={item.key} className="items__row">
              <div className="items__name">
                <label className="field__label" htmlFor={id("name")}>
                  Item {index + 1}
                </label>
                <input
                  id={id("name")}
                  className="input"
                  maxLength={LIMITS.itemName}
                  value={item.name}
                  aria-invalid={error("name") ? true : undefined}
                  onChange={(event) => update(index, { name: event.target.value })}
                />
                {error("name") && <p className="field__error">{error("name")}</p>}
                <label className="field__label items__description-label" htmlFor={id("description")}>
                  Description <span className="muted">(optional)</span>
                </label>
                <textarea
                  id={id("description")}
                  className="input textarea textarea--short"
                  maxLength={LIMITS.itemDescription}
                  value={item.description}
                  onChange={(event) => update(index, { description: event.target.value })}
                />
                {error("description") && <p className="field__error">{error("description")}</p>}
              </div>
              <div>
                <label className="field__label" htmlFor={id("quantity")}>
                  Quantity
                </label>
                <input
                  id={id("quantity")}
                  className="input"
                  inputMode="numeric"
                  value={item.quantity}
                  aria-invalid={error("quantity") ? true : undefined}
                  onChange={(event) => update(index, { quantity: event.target.value })}
                />
                {error("quantity") && <p className="field__error">{error("quantity")}</p>}
              </div>
              <div>
                <label className="field__label" htmlFor={id("unit")}>
                  Unit
                </label>
                <select
                  id={id("unit")}
                  className="input"
                  value={item.unit}
                  onChange={(event) => update(index, { unit: event.target.value as ProductUnit })}
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field__label" htmlFor={id("unitPrice")}>
                  Unit price (₹)
                </label>
                <input
                  id={id("unitPrice")}
                  className="input"
                  inputMode="decimal"
                  value={item.unitPrice}
                  aria-invalid={error("unitPrice") ? true : undefined}
                  onChange={(event) => update(index, { unitPrice: event.target.value })}
                />
                {error("unitPrice") && <p className="field__error">{error("unitPrice")}</p>}
              </div>
              <div className="items__amount">
                <span className="field__label">Amount</span>
                <span>{lineAmount(item)}</span>
              </div>
              {rows.length > 1 && (
                <button
                  type="button"
                  className="link-button items__remove"
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                >
                  Remove item {index + 1}
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <button type="button" className="button button--secondary" onClick={() => onChange([...rows, emptyItem(rows.at(-1)?.unit)])}>
        Add item
      </button>
    </fieldset>
  );
}
