import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const MAX_WORDS_PER_CHUNK = 5;
const SILENCE_THRESHOLD = 0.4; // seconds — force chunk break on gap >= this

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/** GET /api/projects/[id]/status — lightweight polling endpoint for the processing screen */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, status, timeline_data, aspect_ratio")
    .eq("id", id)
    .single();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If an AssemblyAI job is in progress, check its status and finalise if done
  const td = project.timeline_data as {
    _pending?: {
      assemblyai_id: string;
      videoUrl:      string;
      aspectRatio:   string;
      workspaceId:   string;
    };
    error?: string;
  } | null;

  if (project.status === "processing" && td?._pending?.assemblyai_id) {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (apiKey) {
      try {
        const aRes = await fetch(
          `https://api.assemblyai.com/v2/transcript/${td._pending.assemblyai_id}`,
          { headers: { "Authorization": apiKey } },
        );

        if (aRes.ok) {
          const aData = await aRes.json() as {
            status:    string;
            text:      string;
            duration?: number;
            words?:    { text: string; start: number; end: number; speaker?: string }[];
            sentiment_analysis_results?: {
              text: string; start: number; end: number;
              sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
            }[];
          };

          const admin = adminClient();

          if (aData.status === "completed") {
            // Build captions from word-level timestamps (in milliseconds → convert to seconds)
            const words = (aData.words ?? []).map(w => ({
              ...w,
              start:   w.start   / 1000,
              end:     w.end     / 1000,
              speaker: w.speaker ?? undefined,
            }));
            const totalDuration = aData.duration ?? (words.length > 0 ? words[words.length - 1].end : 30);

            // Build sentiment lookup: utterance start → emotion tag
            const sentimentMap = buildSentimentMap(aData.sentiment_analysis_results ?? []);
            const captions     = buildCaptionClips(words, aData.text ?? "", totalDuration, sentimentMap);
            const { videoUrl, aspectRatio, workspaceId } = td._pending;

            const timeline = {
              tracks: [
                { id: "video-track",    type: "video", clips: [{ id: crypto.randomUUID(), url: videoUrl, start_time: 0, duration: totalDuration }] },
                { id: "captions-track", type: "text",  clips: captions },
              ],
              duration:     totalDuration,
              aspect_ratio: aspectRatio,
            };

            await admin.from("projects").update({
              status:           "ready",
              duration_seconds: Math.ceil(totalDuration),
              timeline_data:    timeline,
            }).eq("id", id);

            // Record asset for 30-day cleanup
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            await admin.from("assets").insert({
              workspace_id:     workspaceId,
              type:             "video",
              source:           "uploaded",
              url:              videoUrl,
              duration_seconds: Math.ceil(totalDuration),
              metadata:         { project_id: id, mime_type: "video/*", kind: "caption_source", expires_at: expiresAt.toISOString() },
            });

            return NextResponse.json({ status: "ready", timeline_data: timeline });
          }

          if (aData.status === "error") {
            const errMsg = "AssemblyAI transcription failed — please try again.";
            await admin.from("projects").update({
              status:        "error",
              timeline_data: { error: errMsg },
            }).eq("id", id);
            return NextResponse.json({ status: "error", timeline_data: { error: errMsg } });
          }

          // Still queued or processing — return "processing" so the browser keeps polling
          return NextResponse.json({ status: "processing", timeline_data: null });
        }
      } catch (e) {
        console.error("[status] AssemblyAI check failed:", e);
        // Non-fatal — return the DB status and let it retry next poll
      }
    }
  }

  return NextResponse.json({
    status:        project.status,
    timeline_data: project.timeline_data,
  });
}

// ── Caption helpers ──────────────────────────────────────────────────────────

/**
 * Build caption clips from word-level timestamps.
 *
 * Chunk rules (applied in order, first match wins):
 *   1. Silence gap ≥ SILENCE_THRESHOLD between the previous and current word
 *      → flush existing chunk, start a new one with the current word.
 *   2. Chunk already has MAX_WORDS_PER_CHUNK words → flush, then add current word.
 *
 * Each clip stores `word_timings` so the VideoPlayer can do karaoke highlighting.
 * Duration is the exact word span (last_word.end − first_word.start), not padded
 * into silence. This prevents cross-sentence bleed.
 */
// One colour per speaker label (A–F). Repeats if more than 6 speakers.
const SPEAKER_COLORS: Record<string, string> = {
  A: "#FFFFFF", B: "#60A5FA", C: "#34D399", D: "#F87171", E: "#FBBF24", F: "#A78BFA",
};

type SentimentResult = { text: string; start: number; end: number; sentiment: string };
type EmotionTag = "neutral" | "excited" | "calm" | "urgent" | "funny";

/** Map each sentence start-ms → emotion tag */
function buildSentimentMap(results: SentimentResult[]): Map<number, EmotionTag> {
  const map = new Map<number, EmotionTag>();
  for (const r of results) {
    const emotion: EmotionTag =
      r.sentiment === "POSITIVE" ? "excited" :
      r.sentiment === "NEGATIVE" ? "urgent"  :
      "neutral";
    map.set(r.start, emotion);
  }
  return map;
}

function buildCaptionClips(
  words: { text: string; start: number; end: number; speaker?: string }[],
  fallbackText: string,
  totalDuration: number,
  sentimentMap: Map<number, EmotionTag> = new Map(),
) {
  if (!words.length) {
    return [{
      id:           crypto.randomUUID(),
      text:         fallbackText,
      start_time:   0,
      duration:     totalDuration,
      animation:    "fade" as const,
      color:        "#FFFFFF",
      font_size:    36,
      font_weight:  600,
      font_family:  "Inter",
      position:     { x: 50, y: 80 },
      word_timings: [] as { word: string; start: number; end: number }[],
      emotion:      "neutral" as EmotionTag,
    }];
  }

  type WordEntry = { text: string; start: number; end: number; speaker?: string };
  type CaptionClip = {
    id: string; text: string; start_time: number; duration: number;
    animation: "fade"; color: string; font_size: number; font_weight: number;
    font_family: string; position: { x: number; y: number };
    word_timings: { word: string; start: number; end: number }[];
    speaker?: string; speaker_color?: string; emotion?: EmotionTag;
  };
  const result: CaptionClip[] = [];
  let bucket: WordEntry[] = [];

  const flush = () => {
    if (!bucket.length) return;
    const first   = bucket[0];
    const last    = bucket[bucket.length - 1];
    const speaker = first.speaker;
    // Closest sentiment sentence (within 2s of chunk start, in ms for the map)
    const startMs  = Math.round(first.start * 1000);
    const emotion  = sentimentMap.get(startMs)
      ?? [...sentimentMap.entries()]
           .filter(([ms]) => ms <= startMs && startMs - ms < 2000)
           .sort(([a], [b]) => b - a)[0]?.[1]
      ?? "neutral";

    result.push({
      id:            crypto.randomUUID(),
      text:          bucket.map((w) => w.text).join(" ").trim(),
      start_time:    first.start,
      duration:      Math.max(last.end - first.start, 0.25),
      animation:     "fade" as const,
      color:         speaker ? (SPEAKER_COLORS[speaker] ?? "#FFFFFF") : "#FFFFFF",
      font_size:     36,
      font_weight:   600,
      font_family:   "Inter",
      position:      { x: 50, y: 80 },
      word_timings:  bucket.map((w) => ({ word: w.text, start: w.start, end: w.end })),
      speaker,
      speaker_color: speaker ? (SPEAKER_COLORS[speaker] ?? "#FFFFFF") : undefined,
      emotion,
    });
    bucket = [];
  };

  for (const word of words) {
    const prev = bucket[bucket.length - 1];
    const silenceBreak = prev !== undefined && (word.start - prev.end) >= SILENCE_THRESHOLD;
    const sizeBreak    = bucket.length >= MAX_WORDS_PER_CHUNK;

    if (silenceBreak || sizeBreak) flush();
    bucket.push(word);
  }
  flush(); // remaining words

  return result;
}
