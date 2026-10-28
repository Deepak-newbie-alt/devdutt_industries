import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { ApiError } from "../../api/client";
import { addOrderNote, changeOrderStatus, getOrder, getOrderActivities, NEXT_STATUSES, ORDER_STATUS_LABELS } from "../../api/staffOrders";
import { useEmployee } from "../../auth/EmployeeContext";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { OrderStatusBadge } from "../../features/quotations/RevisionStatusBadge";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { OrderActivity, OrderStatus } from "../../types/api";
import { formatDateTime, formatPrice } from "../../utils/format";

const NOTE_MAX = 1200;

const ACTION_LABELS: Record<OrderStatus, string> = {
  CONFIRMED: "Confirm",
  IN_PRODUCTION: "Start production",
  READY: "Mark ready",
  DISPATCHED: "Mark dispatched",
  DELIVERED: "Mark delivered",
  CANCELLED: "Cancel order",
};

function describe(activity: OrderActivity) {
  if (activity.activityType === "CREATED") return "Order created";
  if (activity.activityType === "NOTE_ADDED") return "Note";
  const from = activity.previousStatus ? ORDER_STATUS_LABELS[activity.previousStatus] : "?";
  const to = activity.newStatus ? ORDER_STATUS_LABELS[activity.newStatus] : "?";
  return `${from} → ${to}`;
}

export function OrderDetailPage() {
  const { employee, request } = useEmployee();
  const { orderId } = useParams();
  const id = Number(orderId);
  const validId = Number.isInteger(id) && id > 0;
  const isSalesperson = employee.role === "SALESPERSON";

  const order = useApiQuery(
    (signal) => (validId ? getOrder(request, id, signal) : Promise.reject(new ApiError("Order not found", 404))),
    [orderId],
  );
  // Admins can read any order's history; a salesperson only their own.
  const activities = useApiQuery(
    (signal) => (validId ? getOrderActivities(request, id, signal) : Promise.resolve([])),
    [orderId],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [note, setNote] = useState("");

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setError(null);

    try {
      await action();
      order.reload();
      activities.reload();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong. Please try again.");
      // A 409 means the order changed elsewhere: show its current state.
      if (caught instanceof ApiError && caught.status === 409) order.reload();
    } finally {
      setBusy(null);
    }
  }

  function submitNote(event: FormEvent) {
    event.preventDefault();
    const text = note.trim();

    if (!text) {
      setError("Write a note first.");
      return;
    }

    void run("note", async () => {
      await addOrderNote(request, id, text);
      setNote("");
    });
  }

  if (order.status === "loading") {
    return (
      <div className="container page-section">
        <LoadingState label="Loading order" />
      </div>
    );
  }

  if (order.status === "error") {
    const status = order.error.status;
    return (
      <div className="container page-section narrow">
        <title>Order | Devdutt Industries Staff</title>
        {status === 404 || status === 400 || status === 403 ? (
          <>
            <h1>{status === 403 ? "This order belongs to someone else" : "Order not found"}</h1>
            <Link to="/app/orders" className="button button--primary">
              Back to orders
            </Link>
          </>
        ) : (
          <LoadError title="This order couldn't be loaded" error={order.error} onRetry={order.reload} />
        )}
      </div>
    );
  }

  const data = order.data;
  const revision = data.quotationRevision;
  const isOwner = isSalesperson && revision.salespersonId === employee.id;
  const next = NEXT_STATUSES[data.status];
  const items = [...data.items].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="container page-section">
      <title>{`${data.orderNumber} | Devdutt Industries Staff`}</title>
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li>
            <Link to="/app/orders">Orders</Link>
          </li>
          <li aria-current="page">{data.orderNumber}</li>
        </ol>
      </nav>

      <header className="detail-header">
        <h1>{data.orderNumber}</h1>
        <OrderStatusBadge status={data.status} />
      </header>

      {error && (
        <StatusMessage tone="error" title="That didn't work">
          <p>{error}</p>
        </StatusMessage>
      )}

      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel" aria-labelledby="order-heading">
            <h2 id="order-heading" className="panel__title">
              Order details
            </h2>
            <dl className="facts">
              <div>
                <dt>Buyer</dt>
                <dd>
                  {revision.buyerName}
                  {revision.companyName && <span className="muted"> · {revision.companyName}</span>}
                </dd>
              </div>
              <div>
                <dt>Mobile</dt>
                <dd>{revision.mobileNumber}</dd>
              </div>
              <div>
                <dt>Machine</dt>
                <dd>{revision.productName}</dd>
              </div>
              <div>
                <dt>From quotation</dt>
                <dd>
                  <Link to={`/app/quotations/${revision.quotationId}`}>Revision {revision.revisionNumber}</Link>
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDateTime(data.createdAt)}</dd>
              </div>
              <div>
                <dt>Order value</dt>
                <dd>{formatPrice(revision.grandTotal)}</dd>
              </div>
            </dl>
            <h3 className="panel__subtitle">Delivery address</h3>
            <p className="preserve-lines">{revision.address}</p>
          </section>

          <section className="panel" aria-labelledby="items-heading">
            <h2 id="items-heading" className="panel__title">
              Items
            </h2>
            <div className="table-wrap">
              <table className="data-table data-table--compact">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Qty</th>
                    <th scope="col" className="numeric">
                      Unit price
                    </th>
                    <th scope="col" className="numeric">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.name}
                        {item.description && <span className="data-table__secondary">{item.description}</span>}
                      </td>
                      <td>
                        {item.quantity} {item.unit}
                      </td>
                      <td className="numeric">{formatPrice(item.unitPrice)}</td>
                      <td className="numeric">{formatPrice(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">Item amounts are before GST; the order value includes any GST.</p>
          </section>

          <section className="panel" aria-labelledby="history-heading">
            <h2 id="history-heading" className="panel__title">
              History
            </h2>
            {activities.status === "loading" && <LoadingState label="Loading history" />}
            {activities.status === "error" && (
              <LoadError title="History couldn't be loaded" error={activities.error} onRetry={activities.reload} />
            )}
            {activities.status === "success" && (
              <ol className="timeline">
                {activities.data.map((activity) => (
                  <li key={activity.id} className={`timeline__item timeline__item--${activity.activityType.toLowerCase()}`}>
                    <p className="timeline__heading">
                      <span className="timeline__label">{describe(activity)}</span>
                      <span className="timeline__meta">{formatDateTime(activity.createdAt)}</span>
                    </p>
                    {activity.note && activity.activityType === "NOTE_ADDED" && <p className="timeline__note">{activity.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="detail-side">
          {isOwner && next.length > 0 && (
            <section className="panel" aria-labelledby="progress-heading">
              <h2 id="progress-heading" className="panel__title">
                Progress
              </h2>
              <div className="button-column">
                {next
                  .filter((status) => status !== "CANCELLED")
                  .map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="button button--accent"
                      disabled={busy !== null}
                      onClick={() => run(status, () => changeOrderStatus(request, id, status))}
                    >
                      {busy === status ? "Updating…" : ACTION_LABELS[status]}
                    </button>
                  ))}
                {next.includes("CANCELLED") &&
                  (confirmCancel ? (
                    <div className="confirm confirm--stacked">
                      <span>Cancel this order? This can't be undone.</span>
                      <button
                        type="button"
                        className="button button--primary"
                        disabled={busy !== null}
                        onClick={() => run("CANCELLED", async () => {
                          await changeOrderStatus(request, id, "CANCELLED");
                          setConfirmCancel(false);
                        })}
                      >
                        {busy === "CANCELLED" ? "Cancelling…" : "Yes, cancel order"}
                      </button>
                      <button type="button" className="button button--secondary" disabled={busy !== null} onClick={() => setConfirmCancel(false)}>
                        Keep order
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="button button--secondary" disabled={busy !== null} onClick={() => setConfirmCancel(true)}>
                      Cancel order…
                    </button>
                  ))}
              </div>
            </section>
          )}

          {isOwner && (
            <form className="panel" onSubmit={submitNote} noValidate>
              <h2 className="panel__title">Add a note</h2>
              <label htmlFor="order-note" className="visually-hidden">
                Note
              </label>
              <textarea
                id="order-note"
                className="input textarea textarea--short"
                maxLength={NOTE_MAX}
                value={note}
                disabled={busy !== null}
                onChange={(event) => setNote(event.target.value)}
              />
              <p className="field__counter">
                {note.length} / {NOTE_MAX}
              </p>
              <button type="submit" className="button button--primary" disabled={busy !== null}>
                {busy === "note" ? "Saving…" : "Save note"}
              </button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
