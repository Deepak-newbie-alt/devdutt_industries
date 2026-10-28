import { Link, useSearchParams } from "react-router";
import { CATALOG_STATUS_LABELS, CATALOG_STATUSES, listAdminCategories } from "../../api/admin";
import { useEmployee } from "../../auth/EmployeeContext";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { Pagination } from "../../components/ui/Pagination";
import { CatalogStatusBadge } from "../../features/admin/StatusBadges";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { CatalogStatus } from "../../types/api";

export function CategoryListPage() {
  const { request } = useEmployee();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status") as CatalogStatus | null;
  const status = statusParam && CATALOG_STATUSES.includes(statusParam) ? statusParam : undefined;
  const page = Math.max(1, Math.floor(Number(searchParams.get("page")) || 1));

  const categories = useApiQuery((signal) => listAdminCategories(request, { page, status }, signal), [searchParams.toString()]);

  const hrefFor = (changes: { status?: CatalogStatus | null; page?: number }) => {
    const query = new URLSearchParams();
    const nextStatus = changes.status === undefined ? status : changes.status;
    if (nextStatus) query.set("status", nextStatus);
    if (changes.page && changes.page > 1) query.set("page", String(changes.page));
    const text = query.toString();
    return text ? `/app/categories?${text}` : "/app/categories";
  };

  return (
    <div className="container page-section">
      <title>Categories | Devdutt Industries Staff</title>
      <header className="page-header page-header--actions">
        <h1>Categories</h1>
        <Link to="/app/categories/new" className="button button--accent">
          Add category
        </Link>
      </header>

      <nav className="tabs" aria-label="Category status">
        <Link to={hrefFor({ status: null })} className="tabs__tab" aria-current={status === undefined ? "page" : undefined}>
          All
        </Link>
        {CATALOG_STATUSES.map((value) => (
          <Link key={value} to={hrefFor({ status: value })} className="tabs__tab" aria-current={value === status ? "page" : undefined}>
            {CATALOG_STATUS_LABELS[value]}
          </Link>
        ))}
      </nav>

      {categories.status === "loading" && <LoadingState label="Loading categories" />}
      {categories.status === "error" && (
        <LoadError title="Categories couldn't be loaded" error={categories.error} onRetry={categories.reload} />
      )}

      {categories.status === "success" &&
        (categories.data.category.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">No categories found</p>
            <p>Only active categories appear on the website.</p>
          </div>
        ) : (
          <>
            <p className="catalog__count">
              {categories.data.meta.totalCategory === 1 ? "1 category" : `${categories.data.meta.totalCategory} categories`} · sorted by
              display order. Only active categories appear on the website.
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col" className="numeric">
                      Order
                    </th>
                    <th scope="col" className="numeric">
                      Products
                    </th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.data.category.map((category) => (
                    <tr key={category.id}>
                      <td>
                        <Link to={`/app/categories/${category.id}`} className="data-table__primary">
                          {category.name}
                        </Link>
                        <span className="data-table__secondary">/{category.slug}</span>
                      </td>
                      <td className="numeric">{category.displayOrder}</td>
                      <td className="numeric">
                        <Link to={`/app/products?category=${category.id}`}>{category._count.products}</Link>
                      </td>
                      <td>
                        <CatalogStatusBadge status={category.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={categories.data.meta.page} totalPages={categories.data.meta.totalPages} hrefFor={(target) => hrefFor({ page: target })} />
          </>
        ))}
    </div>
  );
}
