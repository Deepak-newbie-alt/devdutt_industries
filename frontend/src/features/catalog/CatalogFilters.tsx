import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import type { Category } from "../../types/api";
import type { QueryState } from "../../hooks/useApiQuery";
import { Spinner } from "../../components/ui/Spinner";

export type CatalogParams = {
  search: string;
  categoryId: number | undefined;
  minPrice: number | undefined;
  maxPrice: number | undefined;
};

type CatalogFiltersProps = {
  params: CatalogParams;
  categories: QueryState<Category[]> & { reload: () => void };
  // Link to the catalog with some filters changed (always back to page 1).
  hrefWith: (changes: Partial<CatalogParams>) => string;
  onApply: (changes: Partial<CatalogParams>) => void;
};

function toAmount(value: string) {
  const amount = Number(value);
  return value.trim() !== "" && Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

export function CatalogFilters({ params, categories, hrefWith, onApply }: CatalogFiltersProps) {
  const [search, setSearch] = useState(params.search);
  const [minPrice, setMinPrice] = useState(params.minPrice?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(params.maxPrice?.toString() ?? "");
  const [priceError, setPriceError] = useState<string | null>(null);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    onApply({ search: search.trim() });
  }

  function submitPrice(event: FormEvent) {
    event.preventDefault();
    const min = toAmount(minPrice);
    const max = toAmount(maxPrice);

    // The backend rejects these too; checking here gives a clearer message.
    if ((minPrice.trim() && min === undefined) || (maxPrice.trim() && max === undefined)) {
      setPriceError("Enter prices as positive numbers.");
      return;
    }

    if (min !== undefined && max !== undefined && min >= max) {
      setPriceError("The minimum price must be lower than the maximum.");
      return;
    }

    setPriceError(null);
    onApply({ minPrice: min, maxPrice: max });
  }

  return (
    <aside className="filters" aria-label="Filter machines">
      <form className="filters__group" role="search" onSubmit={submitSearch}>
        <label htmlFor="catalog-search" className="field__label">
          Search by name
        </label>
        <div className="input-row">
          <input
            id="catalog-search"
            className="input"
            type="search"
            value={search}
            maxLength={200}
            placeholder="e.g. bending"
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" className="button button--primary">
            Search
          </button>
        </div>
      </form>

      <div className="filters__group">
        <h2 className="filters__heading">Category</h2>
        {categories.status === "loading" && <Spinner label="Loading categories" />}
        {categories.status === "error" && (
          <p className="muted">
            Categories couldn't be loaded.{" "}
            <button type="button" className="link-button" onClick={categories.reload}>
              Try again
            </button>
          </p>
        )}
        {categories.status === "success" && (
          <ul className="filters__categories">
            <li>
              <Link
                to={hrefWith({ categoryId: undefined })}
                className="filters__category"
                aria-current={params.categoryId === undefined ? "true" : undefined}
              >
                All machines
              </Link>
            </li>
            {categories.data
              // Empty categories lead nowhere; keep one only while it is selected.
              .filter((category) => category.products.length > 0 || category.id === params.categoryId)
              .map((category) => (
              <li key={category.id}>
                <Link
                  to={hrefWith({ categoryId: category.id })}
                  className="filters__category"
                  aria-current={params.categoryId === category.id ? "true" : undefined}
                >
                  {category.name} <span className="filters__count">({category.products.length})</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form className="filters__group" onSubmit={submitPrice} noValidate>
        <h2 className="filters__heading">Price (₹)</h2>
        <div className="price-range">
          <div>
            <label htmlFor="price-min" className="field__label">
              Minimum
            </label>
            <input
              id="price-min"
              className="input"
              inputMode="numeric"
              value={minPrice}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? "price-error" : undefined}
              onChange={(event) => setMinPrice(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="price-max" className="field__label">
              Maximum
            </label>
            <input
              id="price-max"
              className="input"
              inputMode="numeric"
              value={maxPrice}
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? "price-error" : undefined}
              onChange={(event) => setMaxPrice(event.target.value)}
            />
          </div>
        </div>
        {priceError && (
          <p id="price-error" className="field__error" role="alert">
            {priceError}
          </p>
        )}
        <button type="submit" className="button button--secondary">
          Apply price
        </button>
      </form>
    </aside>
  );
}
