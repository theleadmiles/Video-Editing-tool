import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { toFile } from "openai";
import { openrouter } from "@/lib/ai/openrouter";

export const maxDuration = 120;

const WHISPER_MAX    = 25 * 1024 * 1024; // 25 MB
const WORDS_PER_CHUNK = 5;

const LANGUAGE_CODES: Record<string, string> = {
  English:   "en",
  Hindi:     "hi",
  Tamil:     "ta",
  Telugu:    "te",
  Bengali:   "bn",
  Kannada:   "kn",
  Marathi:   "mr",
  Punjabi:   "pa",
  Malayalam: "ml",
  Gujarati:  "gu",
};

/** Service-role Supabase client — bypasses RLS, safe for server-side background use only. */
function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  // ── Parse form data ────────────────────────────────────────────────────────
  const form         = await req.formData();
  const audioUrl     = String(form.get("audio_url")    ?? "");
  const videoUrl     = String(form.get("video_url")    ?? "");
  const languageName = String(form.get("language")     ?? "");
  const titleInput   = String(form.get("title")        ?? "");
  const aspectRatio  = String(form.get("aspect_ratio") ?? "9:16") as "9:16" | "16:9" | "1:1" | "4:5";

  if (!audioUrl) return NextResponse.json({ error: "audio_url required" }, { status: 400 });
  if (!videoUrl) return NextResponse.json({ error: "video_url required" }, { status: 400 });

  // ── Create project immediately with "processing" status ────────────────────
  // This returns to the browser right away — no waiting for Whisper.
  const projectTitle = titleInput.trim() || "Untitled";
  const admin = adminClient();

  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({
      workspace_id:  workspace.id,
      title:         projectTitle.slice(0, 80),
      status:        "processing",
      aspect_ratio:  aspectRatio,
      duration_seconds: 0,
      timeline_data: null,
    })
    .select()
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: projectError?.message ?? "Failed to create project" },
      { status: 500 }
    );
  }

  // ── Return projectId to the browser immediately ────────────────────────────
  // after() runs the heavy work in the background after the response is sent.
  after(async () => {
    try {
      // 1. Fetch audio from R2
      const audioRes = await fetch(audioUrl);
      if (!audioRes.ok) throw new Error(`Could not fetch audio (${audioRes.status})`);
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

      if (audioBuffer.length > WHISPER_MAX) {
        throw new Error(`Audio is ${(audioBuffer.length / 1024 / 1024).toFixed(1)} MB — max is 25 MB (~13 min).`);
      }

      // 2. Transcribe with Whisper via OpenRouter
      const wFile    = await toFile(audioBuffer, "audio.wav", { type: "audio/wav" });
      const langCode = LANGUAGE_CODES[languageName] ?? "";

      const transcription = await openrouter.audio.transcriptions.create({
        file:   wFile,
        model:  "openai/whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["word"],
        ...(langCode ? { language: langCode } : {}),
      }) as {
        text: string;
        duration?: number;
        words?: { word: string; start: number; end: number }[];
      };

      const words         = transcription.words ?? [];
      const totalDuration = transcription.duration ?? (words.length > 0 ? words[words.length - 1].end : 30);
      const captions      = buildCaptionClips(words, transcription.text, totalDuration);

      // 3. Build timeline
      const timeline = {
        tracks: [
          {
            id:    "video-track",
            type:  "video",
            clips: [{ id: crypto.randomUUID(), url: videoUrl, start_time: 0, duration: totalDuration }],
          },
          {
            id:    "captions-track",
            type:  "text",
            clips: captions,
          },
        ],
        duration:     totalDuration,
        aspect_ratio: aspectRatio,
      };

      // 4. Update project to ready
      await admin
        .from("projects")
        .update({
          status:           "ready",
          duration_seconds: Math.ceil(totalDuration),
          timeline_data:    timeline,
        })
        .eq("id", project.id);

      // 5. Record asset for 30-day cleanup
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await admin.from("assets").insert({
        workspace_id:     workspace.id,
        type:             "video",
        source:           "uploaded",
        url:              videoUrl,
        duration_seconds: Math.ceil(totalDuration),
        metadata: {
          project_id: project.id,
          mime_type:  "video/*",
          kind:       "caption_source",
          expires_at: expiresAt.toISOString(),
        },
      });

    } catch (err) {
      // Mark the project as errored so the editor can show a proper message
      const msg = err instanceof Error ? err.message : "Transcription failed";
      console.error(`Transcription failed for project ${project.id}:`, msg);
      await admin
        .from("projects")
        .update({ status: "error", timeline_data: { error: msg } })
        .eq("id", project.id);
    }
  });

  return NextResponse.json({ projectId: project.id });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildCaptionClips(
  words: { word: string; start: number; end: number }[],
  fallbackText: string,
  totalDuration: number,
) {
  if (!words.length) {
    return [{
      id:         crypto.randomUUID(),
      text:       fallbackText,
      start_time: 0,
      duration:   totalDuration,
      animation:  "fade" as const,
      color:      "#FFFFFF",
      font_size:  32,
      position:   { x: 50, y: 80 },
    }];
  }

  const clips = [];
  for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
    const chunk = words.slice(i, i + WORDS_PER_CHUNK);
    const start = chunk[0].start;
    const end   = chunk[chunk.length - 1].end;
    clips.push({
      id:         crypto.randomUUID(),
      text:       chunk.map((w) => w.word).join(" ").trim(),
      start_time: start,
      duration:   Math.max(end - start, 0.3),
      animation:  "fade" as const,
      color:      "#FFFFFF",
      font_size:  32,
      position:   { x: 50, y: 80 },
    });
  }
  return clips;
}
