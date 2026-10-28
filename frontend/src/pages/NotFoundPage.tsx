import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <section className="container page-section narrow">
      <title>Page not found | Devdutt Industries</title>
      <h1>Page not found</h1>
      <p>The page you were looking for doesn't exist or has moved.</p>
      <p>
        <Link to="/machines" className="button button--primary">
          Browse machines
        </Link>
      </p>
    </section>
  );
}
