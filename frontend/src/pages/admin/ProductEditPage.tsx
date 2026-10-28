import { useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ApiError } from "../../api/client";
import {
  CATALOG_STATUS_LABELS,
  CATALOG_STATUSES,
  createProduct,
  getAdminProduct,
  listAllAdminCategories,
  serverFieldErrors,
  slugify,
  updateProduct,
} from "../../api/admin";
import { useEmployee } from "../../auth/EmployeeContext";
import { FormField } from "../../components/ui/FormField";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { ProductMedia } from "../../features/admin/ProductMedia";
import {
  emptyProductState,
  PRODUCT_LIMITS,
  stateFromProduct,
  toProductInput,
  UNITS,
  validateProduct,
  type OriginalSpecs,
  type ProductFormState,
} from "../../features/admin/productFormState";
import { CatalogStatusBadge } from "../../features/admin/StatusBadges";
import { PairsEditor } from "../../features/quotations/PairsEditor";
import type { FormErrors } from "../../features/quotations/quotationFormState";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { AdminCategory, AdminProduct } from "../../types/api";
import { formatUnit } from "../../utils/format";

// /app/products/new and /app/products/:productId
export function ProductEditPage() {
  const { request } = useEmployee();
  const { productId } = useParams();
  const isNew = productId === undefined;
  const id = Number(productId);
  const validId = Number.isInteger(id) && id > 0;

  const product = useApiQuery(
    (signal) =>
      isNew ? Promise.resolve(null) : validId ? getAdminProduct(request, id, signal) : Promise.reject(new ApiError("Product not found", 404)),
    [productId],
  );
  // Every category, any status; the backend returns at most 100 per page.
  const categories = useApiQuery((signal) => listAllAdminCategories(request, signal), []);

  if (product.status === "loading" || categories.status === "loading") {
    return (
      <div className="container page-section">
        <LoadingState label="Loading product" />
      </div>
    );
  }

  if (product.status === "error") {
    return (
      <div className="container page-section narrow">
        <title>Product | Devdutt Industries Staff</title>
        {product.error.status === 404 || product.error.status === 400 ? (
          <>
            <h1>Product not found</h1>
            <Link to="/app/products" className="button button--primary">
              Back to products
            </Link>
          </>
        ) : (
          <LoadError title="This product couldn't be loaded" error={product.error} onRetry={product.reload} />
        )}
      </div>
    );
  }

  if (categories.status === "error") {
    return (
      <div className="container page-section narrow">
        <title>Product | Devdutt Industries Staff</title>
        <LoadError title="Categories couldn't be loaded" error={categories.error} onRetry={categories.reload} />
      </div>
    );
  }

  return (
    <ProductEditor
      key={productId ?? "new"}
      existing={product.data}
      categories={categories.data}
      onSaved={product.reload}
    />
  );
}

function ProductEditor({ existing, categories, onSaved }: { existing: AdminProduct | null; categories: AdminCategory[]; onSaved: () => void }) {
  const { request } = useEmployee();
  const navigate = useNavigate();
  const location = useLocation();
  const [initial] = useState(() => (existing ? stateFromProduct(existing) : { state: emptyProductState(), originals: new Map() as OriginalSpecs }));
  const [state, setState] = useState<ProductFormState>(initial.state);
  const [originals, setOriginals] = useState<OriginalSpecs>(initial.originals);
  // For a new product the web address follows the name until it's edited by hand.
  const [slugTouched, setSlugTouched] = useState(existing !== null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    (location.state as { created?: boolean } | null)?.created ? "Product added. You can add images, videos and a brochure below." : null,
  );
  const [saving, setSaving] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    const followSlug = key === "name" && !slugTouched;
    setState((current) => ({
      ...current,
      [key]: value,
      ...(followSlug ? { slug: slugify(value as string).slice(0, PRODUCT_LIMITS.slug) } : {}),
    }));
    // Editing a field clears its messages (and its rows' messages, for specifications).
    const cleared = followSlug ? [key, "slug"] : [key];
    setErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([path]) => !cleared.some((field) => path === field || path.startsWith(`${field}.`)))),
    );
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    const found = validateProduct(state);
    setErrors(found);
    setSubmitError(null);
    setNotice(null);

    if (Object.keys(found).length > 0) {
      summaryRef.current?.focus();
      return;
    }

    const body = toProductInput(state, originals);
    setSaving(true);

    try {
      if (existing) {
        await updateProduct(request, existing.id, body);
        // What was saved is now the baseline for unchanged specification rows.
        setOriginals(new Map(state.specs.filter((row) => row.label.trim()).map((row) => [row.key, { label: row.label.trim(), value: body.specifications[row.label.trim()] }])));
        setNotice("Changes saved.");
        onSaved();
      } else {
        const created = await createProduct(request, body);
        navigate(`/app/products/${created.id}`, { replace: true, state: { created: true } });
        return;
      }
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : new ApiError("Something went wrong. Please try again.", null);
      setErrors(serverFieldErrors(error.fieldErrors));
      // The web address name is the only unique field on a product.
      setSubmitError(error.status === 409 && !error.message.includes("Referenced") ? "Another product already uses this web address name. Choose a different one." : error.message);
      summaryRef.current?.focus();
    }

    setSaving(false);
  }

  const errorCount = Object.keys(errors).length;
  const title = existing ? existing.name : "Add product";
  const selectedCategory = categories.find((category) => String(category.id) === state.categoryId);

  return (
    <div className="container page-section">
      <title>{`${title} | Devdutt Industries Staff`}</title>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/app/products">Products</Link>
          </li>
          <li aria-current="page">{title}</li>
        </ol>
      </nav>
      <header className="detail-header">
        <h1>{title}</h1>
        {existing && <CatalogStatusBadge status={existing.status} />}
      </header>
      {existing?.status === "ACTIVE" && (
        <p>
          <Link to={`/machines/${existing.id}`} target="_blank" rel="noopener noreferrer">
            View on the website
          </Link>
        </p>
      )}

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
          <legend className="form-section__title">Product</legend>
          <FormField id="product-name" label="Name" error={errors.name}>
            {(a11y) => <input id="product-name" className="input" maxLength={PRODUCT_LIMITS.name} value={state.name} onChange={(e) => set("name", e.target.value)} {...a11y} />}
          </FormField>
          <FormField
            id="product-slug"
            label="Web address name"
            hint="Lowercase letters, numbers and hyphens, e.g. hydraulic-pipe-bender. Must be unique."
            error={errors.slug}
          >
            {(a11y) => (
              <input
                id="product-slug"
                className="input"
                maxLength={PRODUCT_LIMITS.slug}
                value={state.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
                {...a11y}
              />
            )}
          </FormField>
          <FormField id="product-description" label="Description" error={errors.description}>
            {(a11y) => (
              <textarea
                id="product-description"
                className="input textarea"
                maxLength={PRODUCT_LIMITS.description}
                value={state.description}
                onChange={(e) => set("description", e.target.value)}
                {...a11y}
              />
            )}
          </FormField>
          <p className="field__counter">
            {state.description.length} / {PRODUCT_LIMITS.description}
          </p>
          <div className="form-grid">
            <FormField id="product-category" label="Category" error={errors.categoryId}>
              {(a11y) => (
                <select id="product-category" className="input" value={state.categoryId} onChange={(e) => set("categoryId", e.target.value)} {...a11y}>
                  <option value="">Choose a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {category.status !== "ACTIVE" ? ` (${CATALOG_STATUS_LABELS[category.status].toLowerCase()})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField id="product-status" label="Status" hint="Only active products appear on the website." error={errors.status}>
              {(a11y) => (
                <select id="product-status" className="input" value={state.status} onChange={(e) => set("status", e.target.value as ProductFormState["status"])} {...a11y}>
                  {CATALOG_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {CATALOG_STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </div>
          {selectedCategory && selectedCategory.status !== "ACTIVE" && (
            <p className="muted">This category is {CATALOG_STATUS_LABELS[selectedCategory.status].toLowerCase()}, so it isn't listed on the website.</p>
          )}
        </fieldset>

        <fieldset className="form-section" disabled={saving}>
          <legend className="form-section__title">Price</legend>
          <div className="form-grid">
            <FormField id="product-price" label="Listed price (₹)" hint="Before GST. Pre-fills new quotations." error={errors.price}>
              {(a11y) => (
                <input id="product-price" className="input" inputMode="decimal" placeholder="e.g. 185000" value={state.price} onChange={(e) => set("price", e.target.value)} {...a11y} />
              )}
            </FormField>
            <FormField id="product-unit" label="Priced per" error={errors.unit}>
              {(a11y) => (
                <select id="product-unit" className="input" value={state.unit} onChange={(e) => set("unit", e.target.value as ProductFormState["unit"])} {...a11y}>
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {formatUnit(unit, 1)}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
            <FormField id="product-moq" label="Minimum order quantity" error={errors.minimumOrderQuantity}>
              {(a11y) => (
                <input
                  id="product-moq"
                  className="input"
                  inputMode="numeric"
                  value={state.minimumOrderQuantity}
                  onChange={(e) => set("minimumOrderQuantity", e.target.value)}
                  {...a11y}
                />
              )}
            </FormField>
          </div>
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

        <div className="form-actions">
          <button type="submit" className="button button--accent" disabled={saving}>
            {saving ? "Saving…" : existing ? "Save changes" : "Add product"}
          </button>
          <Link to="/app/products" className="button button--secondary">
            {existing ? "Back to products" : "Cancel"}
          </Link>
        </div>
      </form>

      {existing ? (
        <ProductMedia product={existing} onChanged={onSaved} />
      ) : (
        <p className="muted media-note">Images, videos and a brochure can be added once the product is saved.</p>
      )}
    </div>
  );
}
