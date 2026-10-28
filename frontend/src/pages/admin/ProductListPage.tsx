import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CATALOG_STATUS_LABELS, CATALOG_STATUSES, listAdminCategories, listAdminProducts } from "../../api/admin";
import { useEmployee } from "../../auth/EmployeeContext";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { Pagination } from "../../components/ui/Pagination";
import { CatalogStatusBadge } from "../../features/admin/StatusBadges";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { CatalogStatus } from "../../types/api";
import { formatPrice, formatUnit } from "../../utils/format";

export function ProductListPage() {
  const { request } = useEmployee();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusParam = searchParams.get("status") as CatalogStatus | null;
  const status = statusParam && CATALOG_STATUSES.includes(statusParam) ? statusParam : undefined;
  const categoryNumber = Number(searchParams.get("category"));
  const categoryId = Number.isInteger(categoryNumber) && categoryNumber > 0 ? categoryNumber : undefined;
  const search = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Math.floor(Number(searchParams.get("page")) || 1));
  const [searchText, setSearchText] = useState(search);

  const products = useApiQuery(
    (signal) => listAdminProducts(request, { page, status, categoryId, search: search || undefined }, signal),
    [searchParams.toString()],
  );
  // For the category filter; the backend returns at most 100 per page.
  const categories = useApiQuery((signal) => listAdminCategories(request, { page: 1, limit: 100 }, signal), []);

  const hrefFor = (changes: { status?: CatalogStatus | null; category?: number | null; q?: string; page?: number }) => {
    const query = new URLSearchParams();
    const nextStatus = changes.status === undefined ? status : changes.status;
    const nextCategory = changes.category === undefined ? categoryId : changes.category;
    const nextSearch = changes.q === undefined ? search : changes.q;
    if (nextStatus) query.set("status", nextStatus);
    if (nextCategory) query.set("category", String(nextCategory));
    if (nextSearch) query.set("q", nextSearch);
    if (changes.page && changes.page > 1) query.set("page", String(changes.page));
    const text = query.toString();
    return text ? `/app/products?${text}` : "/app/products";
  };

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    navigate(hrefFor({ q: searchText.trim() }));
  }

  return (
    <div className="container page-section">
      <title>Products | Devdutt Industries Staff</title>
      <header className="page-header page-header--actions">
        <h1>Products</h1>
        <Link to="/app/products/new" className="button button--accent">
          Add product
        </Link>
      </header>

      <div className="toolbar">
        <nav className="tabs" aria-label="Product status">
          <Link to={hrefFor({ status: null })} className="tabs__tab" aria-current={status === undefined ? "page" : undefined}>
            All
          </Link>
          {CATALOG_STATUSES.map((value) => (
            <Link key={value} to={hrefFor({ status: value })} className="tabs__tab" aria-current={value === status ? "page" : undefined}>
              {CATALOG_STATUS_LABELS[value]}
            </Link>
          ))}
        </nav>
        <div className="toolbar__filters">
          <div className="field field--inline">
            <label htmlFor="product-category" className="field__label">
              Category
            </label>
            <select
              id="product-category"
              className="input"
              value={categoryId ?? ""}
              disabled={categories.status !== "success"}
              onChange={(event) => navigate(hrefFor({ category: event.target.value ? Number(event.target.value) : null }))}
            >
              <option value="">All categories</option>
              {categories.status === "success" &&
                categories.data.category.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.status !== "ACTIVE" ? ` (${CATALOG_STATUS_LABELS[category.status].toLowerCase()})` : ""}
                  </option>
                ))}
            </select>
          </div>
          <form className="input-row toolbar__search" role="search" onSubmit={submitSearch}>
            <label htmlFor="product-search" className="visually-hidden">
              Search by product name
            </label>
            <input
              id="product-search"
              className="input"
              type="search"
              placeholder="Product name"
              maxLength={200}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <button type="submit" className="button button--secondary">
              Search
            </button>
          </form>
        </div>
      </div>
      {categories.status === "error" && (
        <LoadError title="The category filter couldn't be loaded" error={categories.error} onRetry={categories.reload} />
      )}

      {products.status === "loading" && <LoadingState label="Loading products" />}
      {products.status === "error" && <LoadError title="Products couldn't be loaded" error={products.error} onRetry={products.reload} />}

      {products.status === "success" &&
        (products.data.products.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">No products found</p>
            <p>Try a different filter or search.</p>
          </div>
        ) : (
          <>
            <p className="catalog__count">
              {products.data.meta.totalProducts === 1 ? "1 product" : `${products.data.meta.totalProducts} products`}. Only active
              products appear on the website.
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Category</th>
                    <th scope="col" className="numeric">
                      Price
                    </th>
                    <th scope="col">Media</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.data.products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <Link to={`/app/products/${product.id}`} className="data-table__primary">
                          {product.name}
                        </Link>
                        <span className="data-table__secondary">/{product.slug}</span>
                      </td>
                      <td>
                        {product.category.name}
                        {product.category.status !== "ACTIVE" && (
                          <span className="data-table__secondary">{CATALOG_STATUS_LABELS[product.category.status]} category</span>
                        )}
                      </td>
                      <td className="numeric">
                        {formatPrice(product.price)}
                        <span className="data-table__secondary">per {formatUnit(product.unit, 1)}</span>
                      </td>
                      <td>
                        <span className="data-table__secondary data-table__secondary--flush">
                          {product.images.length} {product.images.length === 1 ? "image" : "images"} · {product.videos.length}{" "}
                          {product.videos.length === 1 ? "video" : "videos"}
                          {product.brochure ? " · brochure" : ""}
                        </span>
                      </td>
                      <td>
                        <CatalogStatusBadge status={product.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={products.data.meta.page} totalPages={products.data.meta.totalPages} hrefFor={(target) => hrefFor({ page: target })} />
          </>
        ))}
    </div>
  );
}
