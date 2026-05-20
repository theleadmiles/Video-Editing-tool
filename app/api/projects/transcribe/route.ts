import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI, { toFile } from "openai";

export const maxDuration = 120;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Whisper hard limit is 25 MB; store up to 200 MB but only transcribe ≤25 MB
const WHISPER_MAX = 25 * 1024 * 1024;
const STORAGE_MAX = 200 * 1024 * 1024;

const SUPPORTED = [
  "video/mp4", "video/quicktime", "video/webm", "video/x-matroska",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac",
];

const WORDS_PER_CHUNK = 5;

// ISO 639-1 codes for Whisper — pass "" to auto-detect
const LANGUAGE_CODES: Record<string, string> = {
  English: "en",
  Hindi: "hi",
  Tamil: "ta",
  Telugu: "te",
  Bengali: "bn",
  Kannada: "kn",
  Marathi: "mr",
  Punjabi: "pa",
  Malayalam: "ml",
  Gujarati: "gu",
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

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const languageName = String(form.get("language") || "");
  const titleInput = String(form.get("title") || "");
  const aspectRatio = String(form.get("aspect_ratio") || "9:16") as "9:16" | "16:9" | "1:1" | "4:5";

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!SUPPORTED.includes(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Please upload MP4, MOV, WebM, or MP3/WAV.` },
      { status: 400 }
    );
  }

  if (file.size > STORAGE_MAX) {
    return NextResponse.json({ error: "File too large (max 200 MB)" }, { status: 413 });
  }

  if (file.size > WHISPER_MAX) {
    return NextResponse.json(
      { error: `File too large for auto-captions (max 25 MB). Please compress your video to under 25 MB and try again. Tip: HandBrake or Clideo can compress for free.` },
      { status: 413 }
    );
  }

  // ── 1. Upload to Supabase Storage ────────────────────────────────────────────
  const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const storagePath = `${workspace.id}/videos/${Date.now()}-${safeFilename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("assets").getPublicUrl(storagePath);
  const videoUrl = urlData.publicUrl;

  // ── 2. Transcribe with Whisper ───────────────────────────────────────────────
  let captions: ReturnType<typeof buildCaptionClips>;
  let totalDuration = 30;

  try {
    const whisperFile = await toFile(buffer, file.name, { type: file.type });
    const langCode = LANGUAGE_CODES[languageName] ?? "";

    const transcription = await openai.audio.transcriptions.create({
      file: whisperFile,
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
    // Clean up the uploaded file if transcription fails
    await supabase.storage.from("assets").remove([storagePath]);
    const msg = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // ── 3. Build timeline_data ───────────────────────────────────────────────────
  const timeline = {
    tracks: [
      {
        id: "video-track",
        type: "video",
        clips: [
          {
            id: crypto.randomUUID(),
            url: videoUrl,
            start_time: 0,
            duration: totalDuration,
          },
        ],
      },
      {
        id: "captions-track",
        type: "text",
        clips: captions,
      },
    ],
    duration: totalDuration,
    aspect_ratio: aspectRatio,
  };

  // ── 4. Create project ────────────────────────────────────────────────────────
  const projectTitle = titleInput.trim() || file.name.replace(/\.[^.]+$/, "").slice(0, 80) || "Untitled";

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspace.id,
      title: projectTitle,
      status: "ready",
      aspect_ratio: aspectRatio,
      duration_seconds: Math.ceil(totalDuration),
      timeline_data: timeline,
    })
    .select()
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: projectError?.message ?? "Failed to create project" }, { status: 500 });
  }

  // ── 5. Record asset ──────────────────────────────────────────────────────────
  await supabase.from("assets").insert({
    workspace_id: workspace.id,
    type: "video",
    source: "uploaded",
    url: videoUrl,
    duration_seconds: Math.ceil(totalDuration),
    metadata: {
      original_name: file.name,
      size_bytes: file.size,
      mime_type: file.type,
      project_id: project.id,
    },
  });

  return NextResponse.json({ projectId: project.id, captionCount: captions.length });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildCaptionClips(
  words: { word: string; start: number; end: number }[],
  fallbackText: string,
  totalDuration: number,
) {
  if (!words.length) {
    return [
      {
        id: crypto.randomUUID(),
        text: fallbackText,
        start_time: 0,
        duration: totalDuration,
        animation: "fade" as const,
        color: "#FFFFFF",
        font_size: 32,
        position: { x: 50, y: 80 },
      },
    ];
  }

  const clips = [];
  for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
    const chunk = words.slice(i, i + WORDS_PER_CHUNK);
    const start = chunk[0].start;
    const end = chunk[chunk.length - 1].end;
    clips.push({
      id: crypto.randomUUID(),
      text: chunk.map((w) => w.word).join(" ").trim(),
      start_time: start,
      duration: Math.max(end - start, 0.3), // min 0.3s
      animation: "fade" as const,
      color: "#FFFFFF",
      font_size: 32,
      position: { x: 50, y: 80 },
    });
  }
  return clips;
}
