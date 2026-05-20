import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI, { toFile } from "openai";

export const maxDuration = 120;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Whisper limit is 25 MB. Client extracts 16 kHz mono WAV before sending,
// so the actual payload here is always small regardless of original video size.
const WHISPER_MAX = 25 * 1024 * 1024;

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

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const form         = await req.formData();
  const audioFile    = form.get("audio")        as File   | null;
  const videoUrl     = String(form.get("video_url")    ?? "");
  const languageName = String(form.get("language")     ?? "");
  const titleInput   = String(form.get("title")        ?? "");
  const aspectRatio  = String(form.get("aspect_ratio") ?? "9:16") as "9:16" | "16:9" | "1:1" | "4:5";

  if (!audioFile) return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
  if (!videoUrl)  return NextResponse.json({ error: "video_url required" },     { status: 400 });

  if (audioFile.size > WHISPER_MAX) {
    return NextResponse.json(
      { error: `Audio is ${(audioFile.size / 1024 / 1024).toFixed(1)} MB — Whisper's limit is 25 MB. Trim your video to under ~13 minutes.` },
      { status: 413 }
    );
  }

  // ── Transcribe with Whisper ────────────────────────────────────────────────
  let captions: ReturnType<typeof buildCaptionClips>;
  let totalDuration = 30;

  try {
    const buffer    = Buffer.from(await audioFile.arrayBuffer());
    const wFile     = await toFile(buffer, "audio.wav", { type: "audio/wav" });
    const langCode  = LANGUAGE_CODES[languageName] ?? "";

    const transcription = await openai.audio.transcriptions.create({
      file: wFile,
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
      ...(langCode ? { language: langCode } : {}),
    }) as {
      text: string;
      duration?: number;
      words?: { word: string; start: number; end: number }[];
    };

    const words = transcription.words ?? [];
    totalDuration =
      transcription.duration ??
      (words.length > 0 ? words[words.length - 1].end : 30);

    captions = buildCaptionClips(words, transcription.text, totalDuration);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // ── Build timeline_data ────────────────────────────────────────────────────
  const timeline = {
    tracks: [
      {
        id:    "video-track",
        type:  "video",
        clips: [{
          id:         crypto.randomUUID(),
          url:        videoUrl,
          start_time: 0,
          duration:   totalDuration,
        }],
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

  // ── Create project ─────────────────────────────────────────────────────────
  const projectTitle = titleInput.trim() || "Untitled";

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      workspace_id:     workspace.id,
      title:            projectTitle.slice(0, 80),
      status:           "ready",
      aspect_ratio:     aspectRatio,
      duration_seconds: Math.ceil(totalDuration),
      timeline_data:    timeline,
    })
    .select()
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: projectError?.message ?? "Failed to create project" }, { status: 500 });
  }

  // ── Record asset row ───────────────────────────────────────────────────────
  await supabase.from("assets").insert({
    workspace_id:     workspace.id,
    type:             "video",
    source:           "uploaded",
    url:              videoUrl,
    duration_seconds: Math.ceil(totalDuration),
    metadata: {
      project_id: project.id,
      mime_type:  "video/*",
    },
  });

  return NextResponse.json({ projectId: project.id, captionCount: captions.length });
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
