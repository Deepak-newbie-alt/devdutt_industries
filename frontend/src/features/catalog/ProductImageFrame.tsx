import { TubeDrawing } from "./MachineDrawing";

type ProductImageFrameProps = {
  src: string | undefined;
  alt: string;
  eager?: boolean;
};

// Fixed 4:3 frame so cards line up and the page doesn't jump while images load.
// Without a photo it shows a line drawing of a tube, clearly a sketch rather than a photograph;
// a real photo replaces it in the same frame.
export function ProductImageFrame({ src, alt, eager = false }: ProductImageFrameProps) {
  return (
    <div className={src ? "image-frame" : "image-frame image-frame--empty"}>
      {src ? (
        <img src={src} alt={alt} width={800} height={600} loading={eager ? "eager" : "lazy"} decoding="async" />
      ) : (
        <>
          <TubeDrawing />
          <span className="image-frame__empty">Photo coming soon</span>
        </>
      )}
    </div>
  );
}
