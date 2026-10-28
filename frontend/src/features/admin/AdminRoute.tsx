import { Link, Outlet } from "react-router";
import { useEmployee } from "../../auth/EmployeeContext";

// Admin pages. The backend checks the role on every request; this only avoids
// showing salespeople pages whose requests would all be refused.
export function AdminRoute() {
  const { employee } = useEmployee();

  if (employee.role !== "ADMIN") {
    return (
      <div className="container page-section narrow">
        <title>Admins only | Devdutt Industries Staff</title>
        <h1>Admins only</h1>
        <p>This page is for administrators.</p>
        <Link to="/app/inquiries" className="button button--primary">
          Go to inquiries
        </Link>
      </div>
    );
  }

  return <Outlet />;
}
