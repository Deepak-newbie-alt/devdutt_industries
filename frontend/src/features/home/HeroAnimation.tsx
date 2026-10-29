import { useEffect, useRef, useState } from "react";

// The machine video (8 s, 24 fps, no sound) and its first frame as a still. The still shows at once,
// the video starts once the page has loaded, and at the end it holds on the assembled machine,
// then dissolves back to the first frame and plays again.
const VIDEO_SRC = "/hero/machine.mp4";
const STILL_SRC = "/hero/poster.webp";
const HOLD_MS = 1500;
// Matches the still's opacity transition in layout.css.
const DISSOLVE_MS = 700;
// Visitors who prefer reduced motion see one pass at this speed, ending on the assembled machine.
const CALM_RATE = 0.5;

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

// Visitors saving data keep the still frame rather than downloading the video.
function savingData() {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return connection?.saveData === true || /2g/.test(connection?.effectiveType ?? "");
}

// Waits for the page's own content to finish loading, then for an idle moment.
function afterPageLoad(callback: () => void) {
  const hasIdle = "requestIdleCallback" in window;
  let handle = 0;
  const schedule = () => {
    handle = hasIdle ? window.requestIdleCallback(callback, { timeout: 2000 }) : window.setTimeout(callback, 200);
  };

  if (document.readyState === "complete") {
    schedule();
  } else {
    window.addEventListener("load", schedule, { once: true });
  }

  return () => {
    window.removeEventListener("load", schedule);
    if (hasIdle) window.cancelIdleCallback(handle);
    else window.clearTimeout(handle);
  };
}

export function HeroAnimation() {
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pausedRef = useRef(false);
  const playRef = useRef<() => void>(undefined);
  const [stillShown, setStillShown] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!stage || !video || savingData()) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timers: number[] = [];
    let visible = true;
    let finished = false;
    let looping = false;

    // React doesn't reliably set the muted attribute, and browsers only autoplay muted video.
    video.muted = true;

    const applyRate = () => {
      video.defaultPlaybackRate = motion.matches ? CALM_RATE : 1;
      video.playbackRate = video.defaultPlaybackRate;
    };

    const play = () => {
      if (!visible || pausedRef.current || finished || looping) return;
      // A refused autoplay (e.g. low-power mode) just leaves the still frame.
      video.play().catch(() => {});
    };

    const onPlaying = () => {
      setPlaying(true);
      setStillShown(false);
    };

    const onEnded = () => {
      if (motion.matches) {
        // One calm pass, then it stays on the assembled machine.
        finished = true;
        setPlaying(false);
        return;
      }
      looping = true;
      timers.push(
        window.setTimeout(() => {
          setStillShown(true);
          timers.push(
            window.setTimeout(() => {
              video.currentTime = 0;
              looping = false;
              play();
            }, DISSOLVE_MS),
          );
        }, HOLD_MS),
      );
    };

    const onError = () => {
      setPlaying(false);
      setStillShown(true);
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
    motion.addEventListener("change", applyRate);
    playRef.current = play;

    const cancelSchedule = afterPageLoad(() => {
      video.src = VIDEO_SRC;
      applyRate();
      observer.observe(stage);
      play();
    });

    return () => {
      cancelSchedule();
      timers.forEach((timer) => window.clearTimeout(timer));
      observer.disconnect();
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      motion.removeEventListener("change", applyRate);
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
    <div ref={stageRef} className="hero-stage">
      <video ref={videoRef} className="hero-stage__video" muted playsInline preload="none" aria-hidden="true" tabIndex={-1} />
      {/* The first frame: shown straight away, kept when the video can't play, and faded in to loop. */}
      <img
        className={stillShown ? "hero-stage__still" : "hero-stage__still hero-stage__still--faded"}
        src={STILL_SRC}
        alt="A pipe bending machine, its gearbox, die, hydraulic cylinder, motor and controls coming together into the assembled machine bending a pipe in a workshop"
        width={1280}
        height={720}
        fetchPriority="high"
        decoding="async"
        onError={(event) => {
          event.currentTarget.hidden = true;
        }}
      />
      {(playing || paused) && (
        <button type="button" className="hero-stage__toggle" onClick={togglePaused} aria-pressed={paused}>
          {paused ? "Play animation" : "Pause animation"}
        </button>
      )}
    </div>
  );
}
