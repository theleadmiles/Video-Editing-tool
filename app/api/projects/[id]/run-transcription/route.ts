import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { toFile } from "openai";
import { openrouter } from "@/lib/ai/openrouter";

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
 * Called internally by the transcribe route. Does the actual Whisper work
 * and updates the project when done. Protected by CRON_SECRET.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Internal auth — same secret used for cron jobs
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;
  const { audioUrl, videoUrl, languageName, aspectRatio, workspaceId } = await req.json();

  const admin = adminClient();

  try {
    if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set in Vercel environment variables");

    // 1. Fetch audio from R2
    console.log(`[run-transcription] fetching audio from ${audioUrl}`);
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error(`R2 audio fetch failed: HTTP ${audioRes.status}`);
    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
    console.log(`[run-transcription] audio fetched: ${(audioBuffer.length / 1024).toFixed(0)} KB`);

    if (audioBuffer.length > WHISPER_MAX) {
      throw new Error(`Audio is ${(audioBuffer.length / 1024 / 1024).toFixed(1)} MB — max 25 MB (~13 min)`);
    }

    // 2. Transcribe with Whisper
    console.log(`[run-transcription] calling Whisper via OpenRouter`);
    const wFile    = await toFile(audioBuffer, "audio.wav", { type: "audio/wav" });
    const langCode = LANGUAGE_CODES[languageName] ?? "";

    const transcription = await openrouter.audio.transcriptions.create({
      file:   wFile,
      model:  "openai/whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
      ...(langCode ? { language: langCode } : {}),
    }) as { text: string; duration?: number; words?: { word: string; start: number; end: number }[] };

    const words         = transcription.words ?? [];
    const totalDuration = transcription.duration ?? (words.length > 0 ? words[words.length - 1].end : 30);
    const captions      = buildCaptionClips(words, transcription.text, totalDuration);
    console.log(`[run-transcription] transcribed: ${captions.length} captions, ${totalDuration.toFixed(1)}s`);

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

function buildCaptionClips(
  words: { word: string; start: number; end: number }[],
  fallbackText: string,
  totalDuration: number,
) {
  if (!words.length) {
    return [{ id: crypto.randomUUID(), text: fallbackText, start_time: 0, duration: totalDuration, animation: "fade" as const, color: "#FFFFFF", font_size: 32, position: { x: 50, y: 80 } }];
  }
  const clips = [];
  for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
    const chunk = words.slice(i, i + WORDS_PER_CHUNK);
    const start = chunk[0].start;
    const end   = chunk[chunk.length - 1].end;
    clips.push({ id: crypto.randomUUID(), text: chunk.map(w => w.word).join(" ").trim(), start_time: start, duration: Math.max(end - start, 0.3), animation: "fade" as const, color: "#FFFFFF", font_size: 32, position: { x: 50, y: 80 } });
  }
  return clips;
}
