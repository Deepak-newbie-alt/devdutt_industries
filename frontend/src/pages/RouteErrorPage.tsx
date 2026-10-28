import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { NotFoundPage } from "./NotFoundPage";

// Shown when rendering a route throws. Kept outside the normal layout so it works
// even if the layout itself failed.
export function RouteErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  console.error(error);

  return (
    <section className="container page-section narrow">
      <title>Something went wrong | Devdutt Industries</title>
      <h1>Something went wrong</h1>
      <p>This page couldn't be displayed. Please reload, or go back to the home page.</p>
      <p className="button-row">
        <button type="button" className="button button--primary" onClick={() => window.location.reload()}>
          Reload page
        </button>
        <Link to="/" className="button button--secondary">
          Home
        </Link>
      </p>
    </section>
  );
}
