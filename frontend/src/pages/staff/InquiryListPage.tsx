import { Link, useSearchParams } from "react-router";
import { INQUIRY_PAGE_SIZE, listInquiries } from "../../api/staffInquiries";
import { useEmployee } from "../../auth/EmployeeContext";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { InquiryStatusBadge } from "../../features/staff/InquiryStatusBadge";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { InquiryStatus, StaffInquiry } from "../../types/api";
import { formatDateTime } from "../../utils/format";

const STATUSES: InquiryStatus[] = ["OPEN", "IN_PROGRESS", "CLOSED"];

// What each tab contains depends on the role: the backend shows a salesperson only
// unclaimed open inquiries plus their own.
const TAB_LABELS: Record<"ADMIN" | "SALESPERSON", Record<InquiryStatus, string>> = {
  SALESPERSON: { OPEN: "Unclaimed", IN_PROGRESS: "My active", CLOSED: "My closed" },
  ADMIN: { OPEN: "Open", IN_PROGRESS: "In progress", CLOSED: "Closed" },
};

const EMPTY: Record<InquiryStatus, string> = {
  OPEN: "No unclaimed enquiries right now.",
  IN_PROGRESS: "No enquiries in progress.",
  CLOSED: "No closed enquiries yet.",
};

function excerpt(text: string, length = 110) {
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

function assignedTo(inquiry: StaffInquiry, employeeId: number) {
  if (inquiry.salespersonId === null) return "Unassigned";
  return inquiry.salespersonId === employeeId ? "You" : `Staff #${inquiry.salespersonId}`;
}

export function InquiryListPage() {
  const { employee, request } = useEmployee();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status") as InquiryStatus | null;
  const status: InquiryStatus = statusParam && STATUSES.includes(statusParam) ? statusParam : "OPEN";
  const page = Math.max(1, Math.floor(Number(searchParams.get("page")) || 1));

  const inquiries = useApiQuery((signal) => listInquiries(request, { status, page }, signal), [status, page]);
  const labels = TAB_LABELS[employee.role];
  const hrefFor = (nextStatus: InquiryStatus, nextPage = 1) =>
    `/app/inquiries?status=${nextStatus}${nextPage > 1 ? `&page=${nextPage}` : ""}`;

  return (
    <div className="container page-section">
      <title>Inquiries | Devdutt Industries Staff</title>
      <header className="page-header">
        <h1>Inquiries</h1>
        {employee.role === "ADMIN" && <p className="muted">You're viewing all inquiries. Only salespeople can claim and work on them.</p>}
      </header>

      <nav className="tabs" aria-label="Inquiry status">
        {STATUSES.map((value) => (
          <Link key={value} to={hrefFor(value)} className="tabs__tab" aria-current={value === status ? "page" : undefined}>
            {labels[value]}
          </Link>
        ))}
      </nav>

      {inquiries.status === "loading" && <LoadingState label="Loading inquiries" />}

      {inquiries.status === "error" && (
        <LoadError title="Inquiries couldn't be loaded" error={inquiries.error} onRetry={inquiries.reload} />
      )}

      {inquiries.status === "success" &&
        (inquiries.data.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">{page > 1 ? "No more inquiries" : EMPTY[status]}</p>
            {page > 1 && <Link to={hrefFor(status)}>Back to the first page</Link>}
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Enquiry</th>
                    <th scope="col">Machine</th>
                    <th scope="col">Requirement</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Status</th>
                    <th scope="col">Quotation</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.data.map((inquiry) => (
                    <tr key={inquiry.id}>
                      <td>
                        <Link to={`/app/inquiries/${inquiry.id}`} className="data-table__primary">
                          #{inquiry.id}
                        </Link>
                        <span className="data-table__secondary">{formatDateTime(inquiry.createdAt)}</span>
                      </td>
                      <td>{inquiry.product.name}</td>
                      <td className="data-table__wrap">{excerpt(inquiry.requirement)}</td>
                      <td>+91 {inquiry.phoneNumber}</td>
                      <td>
                        <InquiryStatusBadge status={inquiry.status} />
                        <span className="data-table__secondary">{assignedTo(inquiry, employee.id)}</span>
                      </td>
                      <td>{inquiry.quotation?.quotationNumber ?? <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav className="pagination" aria-label="Pages">
              {page > 1 ? (
                <Link to={hrefFor(status, page - 1)} className="button button--secondary">
                  Previous
                </Link>
              ) : (
                <span className="button button--secondary" aria-disabled="true">
                  Previous
                </span>
              )}
              <span className="pagination__status">Page {page}</span>
              {inquiries.data.length === INQUIRY_PAGE_SIZE ? (
                <Link to={hrefFor(status, page + 1)} className="button button--secondary">
                  Next
                </Link>
              ) : (
                <span className="button button--secondary" aria-disabled="true">
                  Next
                </span>
              )}
            </nav>
          </>
        ))}
    </div>
  );
}
