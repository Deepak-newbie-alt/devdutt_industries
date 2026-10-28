import { Link, useNavigate, useSearchParams } from "react-router";
import { listCategories, listProducts } from "../api/catalog";
import { LoadError } from "../components/ui/LoadError";
import { LoadingState } from "../components/ui/LoadingState";
import { Pagination } from "../components/ui/Pagination";
import { CatalogFilters, type CatalogParams } from "../features/catalog/CatalogFilters";
import { ProductCard } from "../features/catalog/ProductCard";
import { useApiQuery } from "../hooks/useApiQuery";

const PAGE_SIZE = 12;

function positiveNumber(value: string | null) {
  const number = Number(value);
  return value !== null && Number.isFinite(number) && number > 0 ? number : undefined;
}

// Filters live in the URL so results can be shared, bookmarked and reached with Back.
function readParams(searchParams: URLSearchParams): CatalogParams & { page: number } {
  return {
    search: searchParams.get("q")?.trim() ?? "",
    categoryId: positiveNumber(searchParams.get("category")),
    minPrice: positiveNumber(searchParams.get("minPrice")),
    maxPrice: positiveNumber(searchParams.get("maxPrice")),
    page: Math.floor(positiveNumber(searchParams.get("page")) ?? 1),
  };
}

function buildHref(params: CatalogParams & { page?: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set("q", params.search);
  if (params.categoryId !== undefined) query.set("category", String(params.categoryId));
  if (params.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const text = query.toString();
  return text ? `/machines?${text}` : "/machines";
}

export function CatalogPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = readParams(searchParams);
  const { page, ...filters } = params;

  const categories = useApiQuery((signal) => listCategories(signal), []);
  const products = useApiQuery(
    (signal) =>
      listProducts(
        {
          page,
          limit: PAGE_SIZE,
          search: filters.search || undefined,
          categoryId: filters.categoryId,
          minPrice: filters.minPrice,
          maxPrice: filters.maxPrice,
        },
        signal,
      ),
    [searchParams.toString()],
  );

  const hrefWith = (changes: Partial<CatalogParams>) => buildHref({ ...filters, ...changes });
  const hasFilters =
    filters.search !== "" ||
    filters.categoryId !== undefined ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined;
  const categoryName =
    categories.status === "success"
      ? categories.data.find((category) => category.id === filters.categoryId)?.name
      : undefined;

  return (
    <div className="container page-section">
      <title>{categoryName ? `${categoryName} | Devdutt Industries` : "Machines | Devdutt Industries"}</title>
      <header className="page-header">
        <h1>{categoryName ?? "Machines"}</h1>
        <p className="muted">Listed prices are per unit. Taxes and final terms are confirmed in your quotation.</p>
      </header>

      <div className="catalog">
        <CatalogFilters
          // Re-create the form when the URL changes so its fields match the active filters.
          key={`${filters.search}|${filters.minPrice ?? ""}|${filters.maxPrice ?? ""}`}
          params={filters}
          categories={categories}
          hrefWith={hrefWith}
          onApply={(changes) => navigate(hrefWith(changes))}
        />

        <section className="catalog__results" aria-labelledby="results-heading" aria-busy={products.status === "loading"}>
          <h2 id="results-heading" className="visually-hidden">
            Results
          </h2>

          {products.status === "loading" && <LoadingState label="Loading machines" />}

          {products.status === "error" && (
            <LoadError title="Machines couldn't be loaded" error={products.error} onRetry={products.reload} />
          )}

          {products.status === "success" && (
            <>
              <div className="catalog__summary">
                <p className="catalog__count" aria-live="polite">
                  {products.data.meta.totalProducts === 1
                    ? "1 machine"
                    : `${products.data.meta.totalProducts} machines`}
                  {filters.search && <> matching “{filters.search}”</>}
                </p>
                {hasFilters && (
                  <Link to="/machines" className="link-button">
                    Clear all filters
                  </Link>
                )}
              </div>

              {products.data.products.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-state__title">No machines found</p>
                  {page > 1 && products.data.meta.totalProducts > 0 ? (
                    <p>
                      This page is past the end of the results.{" "}
                      <Link to={buildHref({ ...filters, page: 1 })}>Go to the first page</Link>
                    </p>
                  ) : (
                    <p>
                      Try a different search or category, or{" "}
                      <Link to="/machines">view all machines</Link>.
                    </p>
                  )}
                </div>
              ) : (
                <ul className="product-grid">
                  {products.data.products.map((product) => (
                    <li key={product.id}>
                      <ProductCard product={product} />
                    </li>
                  ))}
                </ul>
              )}

              <Pagination
                page={products.data.meta.page}
                totalPages={products.data.meta.totalPages}
                hrefFor={(target) => buildHref({ ...filters, page: target })}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
