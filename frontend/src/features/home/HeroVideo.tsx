import { useEffect, useRef, useState } from "react";

// The hero background: a machine bending a steel pipe (8 s, 24 fps, no sound). Its start and end
// differ, so it plays once and then rests on the finished bend instead of jumping back to the start.
const VIDEO_SRC = "/hero/machine-bending.mp4";
// The first frame covers the hero until the video plays, so there's no blank area while it loads.
const START_STILL = "/hero/machine-bending-start.webp";
// With reduced motion the browser picks the finished bend instead, and the video is never loaded.
const END_STILL = "/hero/machine-bending-end.webp";

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

// Visitors who asked for less motion or less data keep the still frame.
function prefersStill() {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    connection?.saveData === true ||
    /2g/.test(connection?.effectiveType ?? "")
  );
}

// Runs once the page's own content has loaded, so the video doesn't hold up the rest of the page.
function afterPageLoad(callback: () => void) {
  if (document.readyState === "complete") {
    const timer = window.setTimeout(callback, 0);
    return () => window.clearTimeout(timer);
  }
  window.addEventListener("load", callback, { once: true });
  return () => window.removeEventListener("load", callback);
}

// The media and shade layers of the hero; the hero's content sits above them.
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pausedRef = useRef(false);
  const playRef = useRef<() => void>(undefined);
  const [stillShown, setStillShown] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const hero = video?.closest("section");
    if (!video || !hero || prefersStill()) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let finished = false;

    // React doesn't reliably set the muted attribute, and browsers only autoplay muted video.
    video.muted = true;

    const play = () => {
      if (!visible || pausedRef.current || finished) return;
      // A refused autoplay (e.g. low-power mode) just leaves the still frame.
      video.play().catch(() => {});
    };

    const stop = (showStill: boolean) => {
      finished = true;
      video.pause();
      setPlaying(false);
      setPaused(false);
      if (showStill) setStillShown(true);
    };

    const onPlaying = () => {
      setPlaying(true);
      setStillShown(false);
    };
    // The video stays on its last frame: the finished bend.
    const onEnded = () => stop(false);
    const onError = () => stop(true);
    // Switching on "reduce motion" mid-play goes to the still of the finished bend.
    const onMotionChange = () => {
      if (motion.matches) stop(true);
    };

    // Plays only while the hero is on screen.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) play();
      else video.pause();
    });

    video.addEventListener("playing", onPlaying);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    motion.addEventListener("change", onMotionChange);
    playRef.current = play;

    const cancelStart = afterPageLoad(() => {
      video.src = VIDEO_SRC;
      observer.observe(hero);
      play();
    });

    return () => {
      cancelStart();
      observer.disconnect();
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      motion.removeEventListener("change", onMotionChange);
      video.pause();
      playRef.current = undefined;
    };
  }, []);

  function togglePaused() {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    if (pausedRef.current) videoRef.current?.pause();
    else playRef.current?.();
  }

  return (
    <>
      {/* Background only: the headline carries the meaning, so the media is hidden from screen readers. */}
      <div className="hero__media" aria-hidden="true">
        <video ref={videoRef} muted playsInline preload="none" tabIndex={-1} disablePictureInPicture />
        <picture>
          <source media="(prefers-reduced-motion: reduce)" srcSet={END_STILL} />
          <img
            className={stillShown ? "hero__still" : "hero__still hero__still--faded"}
            src={START_STILL}
            alt=""
            width={1128}
            height={720}
            fetchPriority="high"
            decoding="async"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        </picture>
      </div>
      <div className="hero__shade" />
      {(playing || paused) && (
        <button type="button" className="hero__toggle" onClick={togglePaused} aria-pressed={paused}>
          {paused ? "Play video" : "Pause video"}
        </button>
      )}
    </>
  );
}
