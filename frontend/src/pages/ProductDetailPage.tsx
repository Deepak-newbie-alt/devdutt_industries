import { Link, useParams } from "react-router";
import { getProduct } from "../api/catalog";
import { LoadError } from "../components/ui/LoadError";
import { LoadingState } from "../components/ui/LoadingState";
import { MachineNotFound } from "../features/catalog/MachineNotFound";
import { ProductGallery } from "../features/catalog/ProductGallery";
import { ProductVideos } from "../features/catalog/ProductVideos";
import { SpecificationsTable } from "../features/catalog/SpecificationsTable";
import { useApiQuery } from "../hooks/useApiQuery";
import { formatPrice, formatUnit } from "../utils/format";

export function ProductDetailPage() {
  const { productId } = useParams();
  const id = Number(productId);
  const validId = Number.isInteger(id) && id > 0;

  const product = useApiQuery(
    (signal) => (validId ? getProduct(id, signal) : Promise.reject(null)),
    [productId],
  );

  if (!validId || (product.status === "error" && (product.error.status === 404 || product.error.status === 400))) {
    return <MachineNotFound />;
  }

  if (product.status === "loading") {
    return (
      <div className="container page-section">
        <LoadingState label="Loading machine" />
      </div>
    );
  }

  if (product.status === "error") {
    return (
      <div className="container page-section narrow">
        <LoadError title="This machine couldn't be loaded" error={product.error} onRetry={product.reload} />
      </div>
    );
  }

  const machine = product.data;
  const moq = machine.minimumOrderQuantity;
  const hasVideos = machine.videos.length > 0;
  const resourcesHeading = hasVideos && machine.brochure ? "Videos and brochure" : hasVideos ? "Videos" : "Brochure";

  return (
    <>
      <div className="container page-section product-page">
        <title>{`${machine.name} | Devdutt Industries`}</title>

        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link to="/machines">Machines</Link>
            </li>
            <li>
              <Link to={`/machines?category=${machine.category.id}`}>{machine.category.name}</Link>
            </li>
            <li aria-current="page">{machine.name}</li>
          </ol>
        </nav>

        <div className="product-detail">
          <div className="product-detail__media">
            <ProductGallery images={machine.images} productName={machine.name} />
          </div>

          <div className="product-detail__summary">
            <p className="eyebrow">{machine.category.name}</p>
            <h1 className="product-detail__name">{machine.name}</h1>
            <p className="product-detail__description">{machine.description}</p>

            <div className="product-detail__buy">
              <p className="product-detail__price">
                {formatPrice(machine.price)}{" "}
                <span className="product-detail__unit">per {formatUnit(machine.unit)}</span>
              </p>
              {moq > 1 && (
                <p className="product-detail__moq">
                  Minimum order: {moq} {formatUnit(machine.unit, moq)}
                </p>
              )}
              <div className="product-detail__cta">
                <Link to={`/machines/${machine.id}/enquire`} className="button button--accent button--large">
                  Request a quote
                </Link>
                <p className="muted">No account needed. We'll confirm your phone number with a one-time code.</p>
              </div>
            </div>
          </div>
        </div>

        <section className="detail-section spec-sheet" aria-labelledby="specs-heading">
          <div className="spec-sheet__intro">
            <h2 id="specs-heading">Specifications</h2>
            <p className="muted">Final configuration and terms are confirmed in your quotation.</p>
          </div>
          <SpecificationsTable specifications={machine.specifications} />
        </section>
      </div>

      {(hasVideos || machine.brochure) && (
        <section className="product-resources" aria-labelledby="resources-heading">
          <div className="container product-resources__inner">
            <div className="product-resources__intro">
              <h2 id="resources-heading">{resourcesHeading}</h2>
              {hasVideos && <p>See the {machine.name} at work.</p>}
              {machine.brochure && (
                <a
                  href={machine.brochure.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--inverse product-resources__brochure"
                >
                  Download brochure ({machine.brochure.fileName})
                </a>
              )}
            </div>
            {hasVideos && <ProductVideos videos={machine.videos} />}
          </div>
        </section>
      )}
    </>
  );
}
