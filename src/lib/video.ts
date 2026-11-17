export const getYouTubeVideoId = (url: string) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === "youtu.be" || host === "www.youtu.be")
      return parsed.pathname.slice(1) || null;
    if (
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com"
    )
      return parsed.searchParams.get("v");
  } catch {
    /* Not a video URL. */
  }
  return null;
};
export const getVideoEmbedUrl = (url: string) => {
  const id = getYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
};
export const getYouTubeThumbnailUrl = (url: string) => {
  const id = getYouTubeVideoId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
};
export type VideoLink = { id: string; title: string; url: string };
export const requireWatchVideo = (links: VideoLink[], id: string) => {
  const video = links.find(
    (link) => link.id === id && getVideoEmbedUrl(link.url),
  );
  if (!video) throw new Error(`Video ${id} not found on this record.`);
  return video;
};
