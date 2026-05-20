const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

export interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
  labels: Record<string, string>;
}

export async function getVoices(): Promise<Voice[]> {
  const res = await fetch(`${ELEVENLABS_API}/voices`, {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("Failed to fetch ElevenLabs voices");
  const data = await res.json();
  return data.voices as Voice[];
}

export async function generateVoiceover(
  text: string,
  voiceId: string = "21m00Tcm4TlvDq8ikWAM", // Default: Rachel
  stability: number = 0.5,
  similarityBoost: number = 0.75
): Promise<Buffer> {
  const res = await fetch(
    `${ELEVENLABS_API}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ElevenLabs error: ${error}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Hardcoded popular voices — previews served via /api/voice-sample?voiceId=
export const FEATURED_VOICES = [
  { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", accent: "American", gender: "Female", style: "Professional" },
  { voice_id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", accent: "American", gender: "Female", style: "Energetic" },
  { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", accent: "American", gender: "Female", style: "Soft" },
  { voice_id: "ErXwobaYiN019PkySvjV", name: "Antoni", accent: "American", gender: "Male", style: "Warm" },
  { voice_id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", accent: "American", gender: "Female", style: "Emotional" },
  { voice_id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", accent: "American", gender: "Male", style: "Deep" },
  { voice_id: "VR6AewLTigWG4xSOukaG", name: "Arnold", accent: "American", gender: "Male", style: "Crisp" },
  { voice_id: "pNInz6obpgDQGcFmaJgB", name: "Adam", accent: "American", gender: "Male", style: "Narration" },
  { voice_id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", accent: "American", gender: "Male", style: "Raspy" },
  { voice_id: "t0jbNlBVZ17f02VDIeMI", name: "Clyde", accent: "American", gender: "Male", style: "War Veteran" },
];

export const MUSIC_MOODS = [
  { id: "upbeat", label: "Upbeat & Energetic", emoji: "⚡", query: "upbeat energetic background music" },
  { id: "cinematic", label: "Cinematic & Epic", emoji: "🎬", query: "cinematic epic background music" },
  { id: "lofi", label: "Lo-fi & Chill", emoji: "☕", query: "lofi chill background music" },
  { id: "motivational", label: "Motivational", emoji: "🔥", query: "motivational inspiring background music" },
  { id: "corporate", label: "Corporate & Clean", emoji: "💼", query: "corporate clean background music" },
  { id: "emotional", label: "Emotional & Deep", emoji: "💫", query: "emotional deep background music" },
];
