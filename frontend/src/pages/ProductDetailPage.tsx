import { Link, useParams } from "react-router";
import { getProduct } from "../api/catalog";
import { LoadError } from "../components/ui/LoadError";
import { LoadingState } from "../components/ui/LoadingState";
import { MachineNotFound } from "../features/catalog/MachineNotFound";
import { ProductGallery } from "../features/catalog/ProductGallery";
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

  return (
    <div className="container page-section">
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
        <ProductGallery images={machine.images} productName={machine.name} />

        <div className="product-detail__summary">
          <p className="eyebrow">{machine.category.name}</p>
          <h1 className="product-detail__name">{machine.name}</h1>
          <p className="product-detail__price">
            {formatPrice(machine.price)} <span className="product-detail__unit">per {formatUnit(machine.unit)}</span>
          </p>
          {moq > 1 && (
            <p className="product-detail__moq">
              Minimum order: {moq} {formatUnit(machine.unit, moq)}
            </p>
          )}
          <p className="product-detail__description">{machine.description}</p>

          <div className="product-detail__cta">
            <Link to={`/machines/${machine.id}/enquire`} className="button button--accent">
              Request a quote
            </Link>
            <p className="muted">No account needed. We'll confirm your phone number with a one-time code.</p>
          </div>
        </div>
      </div>

      <section className="detail-section" aria-labelledby="specs-heading">
        <h2 id="specs-heading">Specifications</h2>
        <SpecificationsTable specifications={machine.specifications} />
      </section>

      {(machine.videos.length > 0 || machine.brochure) && (
        <section className="detail-section" aria-labelledby="resources-heading">
          <h2 id="resources-heading">Videos and brochure</h2>
          <ul className="resource-list">
            {machine.brochure && (
              <li>
                <a href={machine.brochure.fileUrl} target="_blank" rel="noopener noreferrer">
                  Download brochure ({machine.brochure.fileName})
                </a>
              </li>
            )}
            {machine.videos.map((video) => (
              <li key={video.id}>
                <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer">
                  Watch: {video.title}
                </a>{" "}
                <span className="muted">(opens YouTube)</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
