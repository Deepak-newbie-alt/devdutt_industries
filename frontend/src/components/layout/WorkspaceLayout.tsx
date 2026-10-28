import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, NavLink, Outlet, ScrollRestoration, useLocation } from "react-router";
import { listClosureRequests } from "../../api/closureRequests";
import { EmployeeProvider, useEmployee } from "../../auth/EmployeeContext";
import { useApiQuery } from "../../hooks/useApiQuery";
import { Logo } from "../brand/Logo";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "workspace-nav__link workspace-nav__link--active" : "workspace-nav__link";

type NavGroup = { title: string; links: { to: string; label: string; pendingCount?: boolean }[] };

const SALESPERSON_NAV: NavGroup[] = [
  {
    title: "Sales",
    links: [
      { to: "/app/inquiries", label: "Inquiries" },
      { to: "/app/orders", label: "Orders" },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  { title: "Dashboard", links: [{ to: "/app/overview", label: "Overview" }] },
  {
    title: "Sales",
    links: [
      { to: "/app/inquiries", label: "Inquiries" },
      { to: "/app/closure-requests", label: "Closure requests", pendingCount: true },
      { to: "/app/orders", label: "Orders" },
    ],
  },
  {
    title: "Catalog",
    links: [
      { to: "/app/products", label: "Products" },
      { to: "/app/categories", label: "Categories" },
    ],
  },
  {
    title: "Settings",
    links: [
      { to: "/app/staff", label: "Staff" },
      { to: "/app/company", label: "Company" },
    ],
  },
];

// How many closure requests wait for an admin, from the existing list endpoint. Refreshed on every
// navigation so it follows approvals; if it can't be loaded the count is simply not shown.
function PendingClosureCount() {
  const { request } = useEmployee();
  const { pathname } = useLocation();
  const pending = useApiQuery(
    (signal) => listClosureRequests(request, { status: "PENDING", page: 1 }, signal),
    [pathname],
  );

  if (pending.status !== "success" || pending.data.meta.totalRequests === 0) {
    return null;
  }

  const count = pending.data.meta.totalRequests;
  return (
    <span className="workspace-nav__count">
      {count}
      <span className="visually-hidden"> waiting for review</span>
    </span>
  );
}

function WorkspaceSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { employee } = useEmployee();
  const navRef = useRef<HTMLElement>(null);
  const groups = employee.role === "ADMIN" ? ADMIN_NAV : SALESPERSON_NAV;

  // On a phone the sidebar opens as a drawer: move focus into it, and close it with Escape.
  useEffect(() => {
    if (!open) {
      return;
    }

    navRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <aside id="workspace-sidebar" className={open ? "workspace-sidebar workspace-sidebar--open" : "workspace-sidebar"}>
        <Link to="/app" className="workspace-sidebar__brand logo-plate" aria-label="Devdutt Industries staff home">
          <Logo />
        </Link>

        <nav ref={navRef} aria-label="Workspace" className="workspace-sidebar__nav">
          {groups.map((group) => (
            <div key={group.title} className="workspace-nav__group">
              <p className="workspace-nav__heading">{group.title}</p>
              <ul className="workspace-nav">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <NavLink to={link.to} className={navLinkClass}>
                      <span>{link.label}</span>
                      {link.pendingCount && <PendingClosureCount />}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <Link to="/" className="workspace-sidebar__site">
          View the public website
        </Link>
      </aside>
      {open && (
        <button type="button" className="workspace-scrim" aria-label="Close menu" tabIndex={-1} onClick={onClose} />
      )}
    </>
  );
}

function WorkspaceTopbar({ menuOpen, onToggleMenu }: { menuOpen: boolean; onToggleMenu: () => void }) {
  const { employee, signOut } = useEmployee();

  return (
    <header className="workspace-topbar">
      <button
        type="button"
        className="workspace-topbar__menu"
        aria-expanded={menuOpen}
        aria-controls="workspace-sidebar"
        onClick={onToggleMenu}
      >
        {menuOpen ? "Close" : "Menu"}
      </button>

      <p className="workspace-topbar__area">
        {employee.role === "ADMIN" ? "Admin workspace" : "Sales workspace"}
      </p>

      <div className="workspace-user">
        <span className="workspace-user__avatar" aria-hidden="true">
          {employee.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="workspace-user__name">
          {employee.name}
          <span className="workspace-user__role">{employee.role === "ADMIN" ? "Admin" : "Salesperson"}</span>
        </span>
        <button type="button" className="button button--secondary workspace-user__signout" onClick={signOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}

function WorkspaceShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Close the drawer after navigating.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="workspace">
      <WorkspaceSidebar open={menuOpen} onClose={closeMenu} />
      <div className="workspace-body">
        <WorkspaceTopbar menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((open) => !open)} />
        <main id="main" className="workspace-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function WorkspaceLayout() {
  return (
    <EmployeeProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <WorkspaceShell />
      <ScrollRestoration />
    </EmployeeProvider>
  );
}

// /app: admins start on the overview, salespeople on their inquiries.
export function WorkspaceHome() {
  const { employee } = useEmployee();
  return <Navigate to={employee.role === "ADMIN" ? "/app/overview" : "/app/inquiries"} replace />;
}
