import { useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { ApiError } from "../../api/client";
import {
  CATALOG_STATUS_LABELS,
  CATALOG_STATUSES,
  createCategory,
  getAdminCategory,
  serverFieldErrors,
  SLUG_PATTERN,
  slugify,
  updateCategory,
  type CategoryInput,
} from "../../api/admin";
import { useEmployee } from "../../auth/EmployeeContext";
import { FormField } from "../../components/ui/FormField";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { CatalogStatusBadge } from "../../features/admin/StatusBadges";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { AdminCategory, CatalogStatus } from "../../types/api";

// Backend validator limits (they match the database columns).
const LIMITS = { name: 100, slug: 120, description: 500 } as const;

type Values = { name: string; slug: string; description: string; displayOrder: string; status: CatalogStatus };
type Errors = Partial<Record<keyof Values, string>>;

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Enter a name.";
  if (!values.slug.trim()) errors.slug = "Enter a web address name.";
  else if (!SLUG_PATTERN.test(values.slug.trim())) errors.slug = "Use lowercase letters, numbers and single hyphens only.";
  if (!/^\d+$/.test(values.displayOrder.trim())) errors.displayOrder = "Enter a whole number, 0 or more.";
  return errors;
}

// /app/categories/new and /app/categories/:categoryId
export function CategoryEditPage() {
  const { request } = useEmployee();
  const { categoryId } = useParams();
  const isNew = categoryId === undefined;
  const id = Number(categoryId);
  const validId = Number.isInteger(id) && id > 0;

  const category = useApiQuery(
    (signal) =>
      isNew ? Promise.resolve(null) : validId ? getAdminCategory(request, id, signal) : Promise.reject(new ApiError("Category not found", 404)),
    [categoryId],
  );

  if (category.status === "loading") {
    return (
      <div className="container page-section">
        <LoadingState label="Loading category" />
      </div>
    );
  }

  if (category.status === "error") {
    return (
      <div className="container page-section narrow">
        <title>Category | Devdutt Industries Staff</title>
        {category.error.status === 404 || category.error.status === 400 ? (
          <>
            <h1>Category not found</h1>
            <Link to="/app/categories" className="button button--primary">
              Back to categories
            </Link>
          </>
        ) : (
          <LoadError title="This category couldn't be loaded" error={category.error} onRetry={category.reload} />
        )}
      </div>
    );
  }

  return <CategoryForm key={categoryId ?? "new"} existing={category.data} onSaved={category.reload} />;
}

function CategoryForm({ existing, onSaved }: { existing: AdminCategory | null; onSaved: () => void }) {
  const { request } = useEmployee();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState<Values>(
    existing
      ? {
          name: existing.name,
          slug: existing.slug,
          description: existing.description ?? "",
          displayOrder: String(existing.displayOrder),
          status: existing.status,
        }
      : { name: "", slug: "", description: "", displayOrder: "0", status: "ACTIVE" },
  );
  // For a new category the web address follows the name until it's edited by hand.
  const [slugTouched, setSlugTouched] = useState(existing !== null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>((location.state as { created?: boolean } | null)?.created ? "Category added." : null);
  const [saving, setSaving] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const set = (key: keyof Values, value: string) => {
    setValues((current) => ({
      ...current,
      [key]: value,
      ...(key === "name" && !slugTouched ? { slug: slugify(value).slice(0, LIMITS.slug) } : {}),
    }));
    // Editing a field clears its message (and the web address's, when it follows the name).
    setErrors((current) => ({ ...current, [key]: undefined, ...(key === "name" && !slugTouched ? { slug: undefined } : {}) }));
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

    const body: CategoryInput = {
      name: values.name.trim(),
      slug: values.slug.trim(),
      description: values.description.trim(),
      displayOrder: Number(values.displayOrder),
      status: values.status,
    };

    setSaving(true);

    try {
      if (existing) {
        await updateCategory(request, existing.id, body);
        setNotice("Changes saved.");
        onSaved();
      } else {
        const created = await createCategory(request, body);
        navigate(`/app/categories/${created.id}`, { replace: true, state: { created: true } });
        return;
      }
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : new ApiError("Something went wrong. Please try again.", null);
      setErrors(serverFieldErrors(error.fieldErrors));
      // A duplicate web address is the only unique field on a category.
      setSubmitError(error.status === 409 ? "Another category already uses this web address name. Choose a different one." : error.message);
      summaryRef.current?.focus();
    }

    setSaving(false);
  }

  const title = existing ? existing.name : "Add category";

  return (
    <div className="container page-section narrow">
      <title>{`${title} | Devdutt Industries Staff`}</title>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/app/categories">Categories</Link>
          </li>
          <li aria-current="page">{title}</li>
        </ol>
      </nav>
      <header className="detail-header">
        <h1>{title}</h1>
        {existing && <CatalogStatusBadge status={existing.status} />}
      </header>
      {existing && (
        <p className="muted">
          {existing._count.products === 1 ? "1 product" : `${existing._count.products} products`} in this category.{" "}
          <Link to={`/app/products?category=${existing.id}`}>View products</Link>
        </p>
      )}

      <form onSubmit={submit} noValidate>
        <div ref={summaryRef} tabIndex={-1} className="quotation-form__summary">
          {notice && (
            <StatusMessage tone="success">
              <p>{notice}</p>
            </StatusMessage>
          )}
          {submitError && (
            <StatusMessage tone="error" title="The category wasn't saved">
              <p>{submitError}</p>
            </StatusMessage>
          )}
        </div>

        <fieldset className="form-section" disabled={saving}>
          <legend className="form-section__title">Category</legend>
          <FormField id="category-name" label="Name" error={errors.name}>
            {(a11y) => <input id="category-name" className="input" maxLength={LIMITS.name} value={values.name} onChange={(e) => set("name", e.target.value)} {...a11y} />}
          </FormField>
          <FormField
            id="category-slug"
            label="Web address name"
            hint="Lowercase letters, numbers and hyphens, e.g. pipe-bending-machines. Must be unique."
            error={errors.slug}
          >
            {(a11y) => (
              <input
                id="category-slug"
                className="input"
                maxLength={LIMITS.slug}
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
                {...a11y}
              />
            )}
          </FormField>
          <FormField id="category-description" label="Description" optional error={errors.description}>
            {(a11y) => (
              <textarea
                id="category-description"
                className="input textarea textarea--short"
                maxLength={LIMITS.description}
                value={values.description}
                onChange={(e) => set("description", e.target.value)}
                {...a11y}
              />
            )}
          </FormField>
          <div className="form-grid form-grid--narrow">
            <FormField id="category-order" label="Display order" hint="Lower numbers come first." error={errors.displayOrder}>
              {(a11y) => (
                <input id="category-order" className="input" inputMode="numeric" value={values.displayOrder} onChange={(e) => set("displayOrder", e.target.value)} {...a11y} />
              )}
            </FormField>
            <FormField id="category-status" label="Status" hint="Only active categories appear on the website." error={errors.status}>
              {(a11y) => (
                <select id="category-status" className="input" value={values.status} onChange={(e) => set("status", e.target.value)} {...a11y}>
                  {CATALOG_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {CATALOG_STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </div>
        </fieldset>

        <div className="form-actions">
          <button type="submit" className="button button--accent" disabled={saving}>
            {saving ? "Saving…" : existing ? "Save changes" : "Add category"}
          </button>
          <Link to="/app/categories" className="button button--secondary">
            {existing ? "Back to categories" : "Cancel"}
          </Link>
        </div>
      </form>
    </div>
  );
}
