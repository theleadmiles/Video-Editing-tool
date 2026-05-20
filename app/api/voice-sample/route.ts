import { NextRequest } from "next/server";

// Proxy ElevenLabs voice preview — avoids CORS and keeps API key server-side
export async function GET(req: NextRequest) {
  const voiceId = req.nextUrl.searchParams.get("voiceId");
  if (!voiceId) {
    return new Response(JSON.stringify({ error: "voiceId required" }), { status: 400 });
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
      next: { revalidate: 86400 }, // Cache for 24h
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Voice not found" }), { status: 404 });
    }

    const voice = await res.json();
    const previewUrl = voice.preview_url;

    if (!previewUrl) {
      return new Response(JSON.stringify({ error: "No preview available" }), { status: 404 });
    }

    // Fetch the audio and stream it back
    const audioRes = await fetch(previewUrl);
    if (!audioRes.ok) {
      return new Response(JSON.stringify({ error: "Could not fetch preview audio" }), { status: 502 });
    }

    const audioBuffer = await audioRes.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("Voice sample error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch voice preview" }), { status: 500 });
  }
}
