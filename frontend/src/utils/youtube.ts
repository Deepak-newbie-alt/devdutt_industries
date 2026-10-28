// The 11-character video id in a YouTube link, or null if it isn't a link to one video.
// Same rules as the backend's product-video validation: youtube.com/watch?v=, /shorts/,
// /embed/, /live/ and youtu.be/ links.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

export function youtubeVideoId(link: string): string | null {
  let url: URL;

  try {
    url = new URL(link);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  let id: string | null = null;

  if (url.hostname === "youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    const [, section, value] = url.pathname.split("/");
    id =
      section === "watch"
        ? url.searchParams.get("v")
        : section === "shorts" || section === "embed" || section === "live"
          ? (value ?? null)
          : null;
  }

  return id !== null && VIDEO_ID.test(id) ? id : null;
}

export const YOUTUBE_LINK_MESSAGE = "Use a link to a YouTube video, e.g. https://www.youtube.com/watch?v=…";
