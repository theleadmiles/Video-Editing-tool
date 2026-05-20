import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const maxDuration = 120;

const WHISPER_MAX     = 25 * 1024 * 1024;
const WORDS_PER_CHUNK = 5;

const LANGUAGE_CODES: Record<string, string> = {
  English: "en", Hindi: "hi", Tamil: "ta", Telugu: "te",
  Bengali: "bn", Kannada: "kn", Marathi: "mr", Punjabi: "pa",
  Malayalam: "ml", Gujarati: "gu",
};

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * POST /api/projects/[id]/run-transcription
 * Called directly from the browser's ProcessingScreen.
 * Uses plain fetch to OpenRouter — no OpenAI SDK, no module init issues.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const { audioUrl, videoUrl, languageName, aspectRatio, workspaceId } = await req.json();

  const admin = adminClient();

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set in Vercel environment variables");

    // 1. Fetch audio from R2
    console.log(`[run-transcription] fetching audio from ${audioUrl}`);
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`R2 audio fetch failed: HTTP ${audioRes.status}`);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    console.log(`[run-transcription] audio fetched: ${(audioBuffer.length / 1024).toFixed(0)} KB`);

    if (audioBuffer.length > WHISPER_MAX) {
      throw new Error(`Audio is ${(audioBuffer.length / 1024 / 1024).toFixed(1)} MB — max 25 MB (~13 min)`);
    }

    // 2. Transcribe with Whisper via plain fetch
    // Uses verbose_json for segment-level timestamps (no timestamp_granularities — not supported by OpenRouter)
    console.log(`[run-transcription] calling Whisper via OpenRouter`);
    const langCode = LANGUAGE_CODES[languageName] ?? "";

    const formData = new FormData();
    formData.append("file", new Blob([audioBuffer], { type: "audio/wav" }), "audio.wav");
    formData.append("model", "openai/whisper-1");
    formData.append("response_format", "verbose_json");
    if (langCode) formData.append("language", langCode);

    const whisperRes = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      throw new Error(`OpenRouter Whisper failed: HTTP ${whisperRes.status} — ${errText}`);
    }

    const transcription = await whisperRes.json() as {
      text: string;
      duration?: number;
      segments?: { text: string; start: number; end: number }[];
    };

    console.log(`[run-transcription] transcription done, building captions`);

    const segments      = transcription.segments ?? [];
    const totalDuration = transcription.duration ?? (segments.length > 0 ? segments[segments.length - 1].end : 30);
    const captions      = buildCaptionClips(segments, transcription.text, totalDuration);
    console.log(`[run-transcription] ${captions.length} captions, ${totalDuration.toFixed(1)}s`);

    // 3. Build timeline & update project
    const timeline = {
      tracks: [
        { id: "video-track",    type: "video", clips: [{ id: crypto.randomUUID(), url: videoUrl, start_time: 0, duration: totalDuration }] },
        { id: "captions-track", type: "text",  clips: captions },
      ],
      duration: totalDuration,
      aspect_ratio: aspectRatio,
    };

    await admin.from("projects").update({
      status:           "ready",
      duration_seconds: Math.ceil(totalDuration),
      timeline_data:    timeline,
    }).eq("id", projectId);

    // 4. Record asset for 30-day cleanup
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await admin.from("assets").insert({
      workspace_id: workspaceId,
      type: "video", source: "uploaded", url: videoUrl,
      duration_seconds: Math.ceil(totalDuration),
      metadata: { project_id: projectId, mime_type: "video/*", kind: "caption_source", expires_at: expiresAt.toISOString() },
    });

    console.log(`[run-transcription] project ${projectId} is ready`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[run-transcription] FAILED project=${projectId}:`, err);
    await admin.from("projects").update({ status: "error", timeline_data: { error: msg } }).eq("id", projectId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Builds caption clips from Whisper segments.
 * Each segment is a natural phrase (~5-10 words) with start/end timestamps.
 * We further split large segments into WORDS_PER_CHUNK word chunks.
 */
function buildCaptionClips(
  segments: { text: string; start: number; end: number }[],
  fallbackText: string,
  totalDuration: number,
) {
  if (!segments.length) {
    return [{
      id: crypto.randomUUID(), text: fallbackText,
      start_time: 0, duration: totalDuration,
      animation: "fade" as const, color: "#FFFFFF", font_size: 32,
      position: { x: 50, y: 80 },
    }];
  }

  const clips = [];
  for (const seg of segments) {
    const words    = seg.text.trim().split(/\s+/).filter(Boolean);
    const segDur   = seg.end - seg.start;
    const secPerW  = segDur / Math.max(words.length, 1);

    for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
      const chunk     = words.slice(i, i + WORDS_PER_CHUNK);
      const chunkStart = seg.start + i * secPerW;
      const chunkEnd   = seg.start + Math.min((i + WORDS_PER_CHUNK) * secPerW, segDur);
      clips.push({
        id: crypto.randomUUID(),
        text: chunk.join(" "),
        start_time: chunkStart,
        duration: Math.max(chunkEnd - chunkStart, 0.3),
        animation: "fade" as const,
        color: "#FFFFFF",
        font_size: 32,
        position: { x: 50, y: 80 },
      });
    }
  }
  return clips;
}
