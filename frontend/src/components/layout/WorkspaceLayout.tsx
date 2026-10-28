import { Link, Navigate, NavLink, Outlet, ScrollRestoration } from "react-router";
import { EmployeeProvider, useEmployee } from "../../auth/EmployeeContext";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "workspace-nav__link workspace-nav__link--active" : "workspace-nav__link";

const SALESPERSON_LINKS = [
  ["/app/inquiries", "Inquiries"],
  ["/app/orders", "Orders"],
] as const;

const ADMIN_LINKS = [
  ["/app/overview", "Overview"],
  ["/app/inquiries", "Inquiries"],
  ["/app/closure-requests", "Closure requests"],
  ["/app/orders", "Orders"],
  ["/app/products", "Products"],
  ["/app/categories", "Categories"],
  ["/app/staff", "Staff"],
  ["/app/company", "Company"],
] as const;

function WorkspaceHeader() {
  const { employee, signOut } = useEmployee();

  return (
    <header className="workspace-header">
      <div className="container workspace-header__inner">
        <Link to="/app" className="workspace-brand">
          <span className="brand__mark" aria-hidden="true">
            DI
          </span>
          <span>
            Devdutt Industries <span className="workspace-brand__area">Staff</span>
          </span>
        </Link>

        <nav aria-label="Workspace">
          <ul className="workspace-nav">
            {(employee.role === "ADMIN" ? ADMIN_LINKS : SALESPERSON_LINKS).map(([to, label]) => (
              <li key={to}>
                <NavLink to={to} className={navLinkClass}>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="workspace-user">
          <span className="workspace-user__name">
            {employee.name}
            <span className="workspace-user__role">{employee.role === "ADMIN" ? "Admin" : "Salesperson"}</span>
          </span>
          <button type="button" className="button button--secondary workspace-user__signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}

export function WorkspaceLayout() {
  return (
    <EmployeeProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="page workspace">
        <WorkspaceHeader />
        <main id="main" className="page__main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <ScrollRestoration />
    </EmployeeProvider>
  );
}

// /app: admins start on the overview, salespeople on their inquiries.
export function WorkspaceHome() {
  const { employee } = useEmployee();
  return <Navigate to={employee.role === "ADMIN" ? "/app/overview" : "/app/inquiries"} replace />;
}
