import { Link } from "react-router";

type PaginationProps = {
  page: number;
  totalPages: number;
  // Builds the link for a page, keeping the current filters.
  hrefFor: (page: number) => string;
};

export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label="Pages">
      {page > 1 ? (
        <Link to={hrefFor(page - 1)} className="button button--secondary" rel="prev">
          Previous
        </Link>
      ) : (
        <span className="button button--secondary" aria-disabled="true">
          Previous
        </span>
      )}

      <span className="pagination__status">
        Page {page} of {totalPages}
      </span>

      {page < totalPages ? (
        <Link to={hrefFor(page + 1)} className="button button--secondary" rel="next">
          Next
        </Link>
      ) : (
        <span className="button button--secondary" aria-disabled="true">
          Next
        </span>
      )}
    </nav>
  );
}
