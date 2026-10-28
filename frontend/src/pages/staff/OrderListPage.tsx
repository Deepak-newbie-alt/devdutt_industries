import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { listOrders, ORDER_STATUS_LABELS } from "../../api/staffOrders";
import { useEmployee } from "../../auth/EmployeeContext";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { Pagination } from "../../components/ui/Pagination";
import { OrderStatusBadge } from "../../features/quotations/RevisionStatusBadge";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { OrderStatus } from "../../types/api";
import { formatDateTime, formatPrice } from "../../utils/format";

const STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export function OrderListPage() {
  const { employee, request } = useEmployee();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusParam = searchParams.get("status") as OrderStatus | null;
  const status = statusParam && STATUSES.includes(statusParam) ? statusParam : undefined;
  const search = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Math.floor(Number(searchParams.get("page")) || 1));
  const [searchText, setSearchText] = useState(search);

  const orders = useApiQuery(
    (signal) => listOrders(request, { page, status, search: search || undefined }, signal),
    [searchParams.toString()],
  );

  const hrefFor = (changes: { status?: OrderStatus | null; q?: string; page?: number }) => {
    const query = new URLSearchParams();
    const nextStatus = changes.status === undefined ? status : changes.status;
    const nextSearch = changes.q === undefined ? search : changes.q;
    if (nextStatus) query.set("status", nextStatus);
    if (nextSearch) query.set("q", nextSearch);
    if (changes.page && changes.page > 1) query.set("page", String(changes.page));
    const text = query.toString();
    return text ? `/app/orders?${text}` : "/app/orders";
  };

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    navigate(hrefFor({ q: searchText.trim() }));
  }

  return (
    <div className="container page-section">
      <title>Orders | Devdutt Industries Staff</title>
      <header className="page-header">
        <h1>{employee.role === "ADMIN" ? "Orders" : "My orders"}</h1>
      </header>

      <div className="toolbar">
        <nav className="tabs" aria-label="Order status">
          <Link to={hrefFor({ status: null })} className="tabs__tab" aria-current={status === undefined ? "page" : undefined}>
            All
          </Link>
          {STATUSES.map((value) => (
            <Link key={value} to={hrefFor({ status: value })} className="tabs__tab" aria-current={value === status ? "page" : undefined}>
              {ORDER_STATUS_LABELS[value]}
            </Link>
          ))}
        </nav>
        <form className="input-row toolbar__search" role="search" onSubmit={submitSearch}>
          <label htmlFor="order-search" className="visually-hidden">
            Search by order number
          </label>
          <input
            id="order-search"
            className="input"
            type="search"
            placeholder="Order number, e.g. ODR-2026"
            maxLength={60}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <button type="submit" className="button button--secondary">
            Search
          </button>
        </form>
      </div>

      {orders.status === "loading" && <LoadingState label="Loading orders" />}
      {orders.status === "error" && <LoadError title="Orders couldn't be loaded" error={orders.error} onRetry={orders.reload} />}

      {orders.status === "success" &&
        (orders.data.orders.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">No orders found</p>
            <p>Orders are created from accepted quotations.</p>
          </div>
        ) : (
          <>
            <p className="catalog__count">{orders.data.metadata.total === 1 ? "1 order" : `${orders.data.metadata.total} orders`}</p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Buyer</th>
                    <th scope="col">Machine</th>
                    <th scope="col" className="numeric">
                      Value
                    </th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data.orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <Link to={`/app/orders/${order.id}`} className="data-table__primary">
                          {order.orderNumber}
                        </Link>
                        <span className="data-table__secondary">{formatDateTime(order.createdAt)}</span>
                      </td>
                      <td>
                        {order.quotationRevision.buyerName}
                        {order.quotationRevision.companyName && (
                          <span className="data-table__secondary">{order.quotationRevision.companyName}</span>
                        )}
                      </td>
                      <td>{order.quotationRevision.productName}</td>
                      <td className="numeric">{formatPrice(order.quotationRevision.grandTotal)}</td>
                      <td>
                        <OrderStatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={orders.data.metadata.page} totalPages={orders.data.metadata.totalPages} hrefFor={(target) => hrefFor({ page: target })} />
          </>
        ))}
    </div>
  );
}
