import type { ProductVideo } from "../../types/api";
import { youtubeVideoId } from "../../utils/youtube";

// YouTube's embedded player, one per video, in display order. Only the extracted video id is
// placed in the player address, never the stored link. The privacy-enhanced domain sets no
// cookies until the visitor plays a video, and players load only when scrolled near.
export function ProductVideos({ videos }: { videos: ProductVideo[] }) {
  return (
    <ul className="video-list">
      {videos.map((video) => {
        const id = youtubeVideoId(video.youtubeUrl);

        // Links saved before only YouTube links were accepted: keep them as plain links.
        if (!id) {
          return (
            <li key={video.id} className="video-list__item">
              <a href={video.youtubeUrl} target="_blank" rel="noopener noreferrer">
                Watch: {video.title}
              </a>{" "}
              <span className="muted">(opens in a new tab)</span>
            </li>
          );
        }

        return (
          <li key={video.id} className="video-list__item">
            <figure className="video">
              <div className="video__frame">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
                  title={`Video: ${video.title}`}
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
              <figcaption className="video__caption">
                <span className="video__title">{video.title}</span>
                {/* If the player is blocked or won't play here, YouTube itself still works. */}
                <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer">
                  Watch on YouTube<span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </figcaption>
            </figure>
          </li>
        );
      })}
    </ul>
  );
}
