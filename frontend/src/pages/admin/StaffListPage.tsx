import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { listUsers, ROLE_LABELS } from "../../api/admin";
import { useEmployee } from "../../auth/EmployeeContext";
import { LoadError } from "../../components/ui/LoadError";
import { LoadingState } from "../../components/ui/LoadingState";
import { Pagination } from "../../components/ui/Pagination";
import { UserStatusBadge } from "../../features/admin/StatusBadges";
import { useApiQuery } from "../../hooks/useApiQuery";
import type { Employee, UserRole } from "../../types/api";
import { formatDateTime } from "../../utils/format";

const ROLES = Object.keys(ROLE_LABELS) as UserRole[];
const STATUSES: Employee["status"][] = ["ACTIVE", "INACTIVE"];

export function StaffListPage() {
  const { employee, request } = useEmployee();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roleParam = searchParams.get("role") as UserRole | null;
  const role = roleParam && ROLES.includes(roleParam) ? roleParam : undefined;
  const statusParam = searchParams.get("status") as Employee["status"] | null;
  const status = statusParam && STATUSES.includes(statusParam) ? statusParam : undefined;
  const search = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Math.floor(Number(searchParams.get("page")) || 1));
  const [searchText, setSearchText] = useState(search);

  const users = useApiQuery(
    (signal) => listUsers(request, { page, role, status, search: search || undefined }, signal),
    [searchParams.toString()],
  );

  const hrefFor = (changes: { role?: UserRole | null; status?: Employee["status"] | null; q?: string; page?: number }) => {
    const query = new URLSearchParams();
    const nextRole = changes.role === undefined ? role : changes.role;
    const nextStatus = changes.status === undefined ? status : changes.status;
    const nextSearch = changes.q === undefined ? search : changes.q;
    if (nextRole) query.set("role", nextRole);
    if (nextStatus) query.set("status", nextStatus);
    if (nextSearch) query.set("q", nextSearch);
    if (changes.page && changes.page > 1) query.set("page", String(changes.page));
    const text = query.toString();
    return text ? `/app/staff?${text}` : "/app/staff";
  };

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    navigate(hrefFor({ q: searchText.trim() }));
  }

  return (
    <div className="container page-section">
      <title>Staff | Devdutt Industries Staff</title>
      <header className="page-header page-header--actions">
        <h1>Staff</h1>
        <Link to="/app/staff/new" className="button button--accent">
          Add salesperson
        </Link>
      </header>

      <div className="toolbar">
        <div className="toolbar__filters">
          <nav className="tabs" aria-label="Role">
            <Link to={hrefFor({ role: null })} className="tabs__tab" aria-current={role === undefined ? "page" : undefined}>
              All roles
            </Link>
            {ROLES.map((value) => (
              <Link key={value} to={hrefFor({ role: value })} className="tabs__tab" aria-current={value === role ? "page" : undefined}>
                {value === "ADMIN" ? "Admins" : "Salespeople"}
              </Link>
            ))}
          </nav>
          <nav className="tabs" aria-label="Status">
            <Link to={hrefFor({ status: null })} className="tabs__tab" aria-current={status === undefined ? "page" : undefined}>
              Any status
            </Link>
            {STATUSES.map((value) => (
              <Link key={value} to={hrefFor({ status: value })} className="tabs__tab" aria-current={value === status ? "page" : undefined}>
                {value === "ACTIVE" ? "Active" : "Inactive"}
              </Link>
            ))}
          </nav>
        </div>
        <form className="input-row toolbar__search" role="search" onSubmit={submitSearch}>
          <label htmlFor="staff-search" className="visually-hidden">
            Search by name, email or phone
          </label>
          <input
            id="staff-search"
            className="input"
            type="search"
            placeholder="Name, email or phone"
            maxLength={100}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <button type="submit" className="button button--secondary">
            Search
          </button>
        </form>
      </div>

      {users.status === "loading" && <LoadingState label="Loading staff" />}
      {users.status === "error" && <LoadError title="Staff couldn't be loaded" error={users.error} onRetry={users.reload} />}

      {users.status === "success" &&
        (users.data.users.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state__title">No staff found</p>
            <p>Try a different filter or search.</p>
          </div>
        ) : (
          <>
            <p className="catalog__count">
              {users.data.pagination.total === 1 ? "1 person" : `${users.data.pagination.total} people`}
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data.users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <Link to={`/app/staff/${user.id}`} className="data-table__primary">
                          {user.name}
                          {user.id === employee.id && <span className="muted"> (you)</span>}
                        </Link>
                        <span className="data-table__secondary">{user.email}</span>
                      </td>
                      <td>{user.phone}</td>
                      <td>{ROLE_LABELS[user.role]}</td>
                      <td>
                        <UserStatusBadge status={user.status} />
                        <span className="data-table__secondary">Added {formatDateTime(user.createdAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={users.data.pagination.page}
              totalPages={users.data.pagination.totalPages}
              hrefFor={(target) => hrefFor({ page: target })}
            />
          </>
        ))}
    </div>
  );
}
