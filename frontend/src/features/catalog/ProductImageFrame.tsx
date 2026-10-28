type ProductImageFrameProps = {
  src: string | undefined;
  alt: string;
  eager?: boolean;
  // Shown in place of a photo until one is added (e.g. the machine's category).
  placeholderLabel?: string;
};

// Fixed 4:3 frame so cards line up and the page doesn't jump while images load.
// Without a photo it shows a plain branded panel set in type; a real photo replaces it in the same frame.
export function ProductImageFrame({ src, alt, eager = false, placeholderLabel }: ProductImageFrameProps) {
  return (
    <div className={src ? "image-frame" : "image-frame image-frame--empty"}>
      {src ? (
        <img src={src} alt={alt} width={800} height={600} loading={eager ? "eager" : "lazy"} decoding="async" />
      ) : (
        <span className="image-frame__placeholder">
          {placeholderLabel && <span className="image-frame__label">{placeholderLabel}</span>}
          <span className="image-frame__empty">Photo coming soon</span>
        </span>
      )}
    </div>
  );
}
