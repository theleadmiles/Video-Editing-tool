const PIXABAY_API = "https://pixabay.com/api/videos";

export interface PixabayMusic {
  id: number;
  pageURL: string;
  duration: number;
  videos: {
    tiny: { url: string };
    small: { url: string };
    medium: { url: string };
  };
}

// Pixabay music API
const PIXABAY_MUSIC_API = "https://pixabay.com/api/music";

export async function getMusicByMood(mood: string): Promise<{ url: string; title: string } | null> {
  const moodQueryMap: Record<string, string> = {
    upbeat: "upbeat",
    cinematic: "cinematic",
    lofi: "calm",
    motivational: "inspiring",
    corporate: "corporate",
    emotional: "emotional",
  };

  const query = moodQueryMap[mood] || "background";

  const params = new URLSearchParams({
    key: process.env.PIXABAY_API_KEY!,
    q: query,
    per_page: "5",
  });

  try {
    const res = await fetch(`${PIXABAY_MUSIC_API}/?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.hits || data.hits.length === 0) return null;

    // Pick a random one from top 5 for variety
    const track = data.hits[Math.floor(Math.random() * Math.min(data.hits.length, 5))];
    const audioUrl = track?.audio || track?.url || track?.preview_url;
    if (!audioUrl) return null;
    return {
      url: audioUrl,
      title: track.title || "Background music",
    };
  } catch {
    return null;
  }
}
