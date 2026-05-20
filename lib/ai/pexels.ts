const PEXELS_API = "https://api.pexels.com/videos";

export interface PexelsVideo {
  id: number;
  url: string;
  duration: number;
  video_files: { link: string; quality: string; width: number; height: number }[];
  image: string; // thumbnail
}

export async function searchBroll(
  query: string,
  orientation: "portrait" | "landscape" | "square" = "portrait",
  perPage: number = 3
): Promise<PexelsVideo[]> {
  const params = new URLSearchParams({
    query,
    orientation,
    per_page: String(perPage),
    size: "medium",
  });

  const res = await fetch(`${PEXELS_API}/search?${params}`, {
    headers: { Authorization: process.env.PEXELS_API_KEY! },
  });

  if (!res.ok) throw new Error(`Pexels error: ${res.statusText}`);

  const data = await res.json();
  return (data.videos || []) as PexelsVideo[];
}

export function getBestVideoFile(
  video: PexelsVideo,
  preferHD: boolean = true
): string {
  const files = video.video_files.sort((a, b) => b.width - a.width);
  const hd = files.find((f) => f.quality === "hd" || f.width >= 720);
  const sd = files.find((f) => f.quality === "sd");
  return preferHD ? (hd?.link || sd?.link || files[0]?.link) : (sd?.link || files[0]?.link);
}

export async function fetchBrollForSections(
  sections: { broll_query: string; duration: number }[],
  orientation: "portrait" | "landscape" | "square" = "portrait"
): Promise<{ url: string; thumbnail: string; duration: number; query: string }[]> {
  const results = await Promise.allSettled(
    sections.map(async (section) => {
      const videos = await searchBroll(section.broll_query, orientation, 2);
      if (!videos.length) {
        // Fallback to generic query
        const fallback = await searchBroll("cinematic background", orientation, 1);
        const v = fallback[0];
        return {
          url: v ? getBestVideoFile(v) : "",
          thumbnail: v?.image || "",
          duration: section.duration,
          query: section.broll_query,
        };
      }
      const v = videos[0];
      return {
        url: getBestVideoFile(v),
        thumbnail: v.image,
        duration: section.duration,
        query: section.broll_query,
      };
    })
  );

  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<{ url: string; thumbnail: string; duration: number; query: string }>).value)
    .filter((r) => r.url);
}
