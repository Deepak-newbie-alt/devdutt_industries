import { Link } from "react-router";

export function MachineNotFound() {
  return (
    <div className="container page-section narrow">
      <title>Machine not found | Devdutt Industries</title>
      <h1>Machine not found</h1>
      <p>This machine doesn't exist or is no longer listed.</p>
      <Link to="/machines" className="button button--primary">
        Browse machines
      </Link>
    </div>
  );
}
