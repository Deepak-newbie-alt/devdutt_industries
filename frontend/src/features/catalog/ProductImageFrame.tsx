type ProductImageFrameProps = {
  src: string | undefined;
  alt: string;
  eager?: boolean;
};

// Fixed 4:3 frame so cards line up and the page doesn't jump while images load.
export function ProductImageFrame({ src, alt, eager = false }: ProductImageFrameProps) {
  return (
    <div className="image-frame">
      {src ? (
        <img src={src} alt={alt} width={800} height={600} loading={eager ? "eager" : "lazy"} decoding="async" />
      ) : (
        <span className="image-frame__empty">No photo yet</span>
      )}
    </div>
  );
}
