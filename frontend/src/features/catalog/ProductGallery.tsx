import { useState } from "react";
import type { ProductImage } from "../../types/api";
import { ProductImageFrame } from "./ProductImageFrame";

type ProductGalleryProps = {
  images: ProductImage[];
  productName: string;
};

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0];

  return (
    <div className="gallery">
      <ProductImageFrame
        src={current?.imageUrl}
        alt={images.length > 1 ? `${productName}, image ${selected + 1} of ${images.length}` : productName}
        eager
      />

      {images.length > 1 && (
        <ul className="gallery__thumbs" aria-label="Choose image">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                className="gallery__thumb"
                aria-label={`Show image ${index + 1}`}
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
              >
                <img src={image.imageUrl} alt="" width={120} height={90} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
