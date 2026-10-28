// The Devdutt wordmark, cropped from the supplied logo file (colours and shape unchanged).
// The image has a white background, so on dark surfaces wrap it in .logo-plate.
export function Logo({ className = "logo" }: { className?: string }) {
  return (
    <img
      className={className}
      src="/brand/devdutt-wordmark-320.png"
      srcSet="/brand/devdutt-wordmark-320.png 320w, /brand/devdutt-wordmark-640.png 640w"
      sizes="12rem"
      width={320}
      height={79}
      alt="Devdutt Industries"
      decoding="async"
    />
  );
}
