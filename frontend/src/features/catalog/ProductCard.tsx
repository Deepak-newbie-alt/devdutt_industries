import { Link } from "react-router";
import type { Product } from "../../types/api";
import { formatPrice, formatUnit } from "../../utils/format";
import { ProductImageFrame } from "./ProductImageFrame";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="product-card">
      <ProductImageFrame src={product.images[0]?.imageUrl} alt="" />
      <div className="product-card__body">
        <p className="product-card__category">{product.category.name}</p>
        <h3 className="product-card__name">
          {/* The link covers the whole card (see .product-card__link::after). */}
          <Link to={`/machines/${product.id}`} className="product-card__link">
            {product.name}
          </Link>
        </h3>
        <div className="product-card__footer">
          <p className="product-card__price">
            {formatPrice(product.price)} <span className="product-card__unit">per {formatUnit(product.unit)}</span>
          </p>
          {/* Visual cue only; the card's link already says where it goes. */}
          <span className="product-card__more arrow-link" aria-hidden="true">
            Details
          </span>
        </div>
      </div>
    </article>
  );
}
