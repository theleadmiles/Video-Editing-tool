import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getMusicByMood } from "@/lib/ai/pixabay";

export const maxDuration = 30;

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspaces").select("id").eq("owner_id", user.id).single();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  // ── Parse inputs ──────────────────────────────────────────────────────────
  const body = await req.json();
  const {
    title            = "My Reel",
    clips            = [] as { url: string; thumbnail?: string; duration?: number }[],
    musicMood        = "upbeat",
    customMusicUrl   = null as string | null,   // user-uploaded music URL
    clipDuration     = 3,                        // fallback: equal duration per clip
    clipDurations    = null as number[] | null,  // beat-synced per-clip durations
    musicStartTime   = 0,                        // best segment start offset in the track
    targetDuration   = null as number | null,    // desired total reel duration
    transition       = "cut",                    // "cut" | "fade"
    aspectRatio      = "9:16",
  } = body;

  if (!clips.length) {
    return NextResponse.json({ error: "No clips provided" }, { status: 400 });
  }

  // ── Fetch music ────────────────────────────────────────────────────────────
  // If the user provided their own music file, skip the Pixabay fetch
  let musicUrl: string | null = customMusicUrl || null;
  if (!musicUrl) {
    try {
      const music = await getMusicByMood(musicMood);
      musicUrl = music?.url ?? null;
    } catch { /* music is optional */ }
  }

  // ── Resolve per-clip durations ─────────────────────────────────────────────
  // If beat-synced durations were computed on the client, use them.
  // Otherwise fall back to equal duration per clip.
  const hasBeatDurations =
    Array.isArray(clipDurations) &&
    clipDurations.length === clips.length &&
    clipDurations.every((d: number) => typeof d === "number" && d > 0);

  const durations: number[] = hasBeatDurations
    ? (clipDurations as number[])
    : Array(clips.length).fill(Number(clipDuration) || 3);

  const totalDuration =
    targetDuration && targetDuration > 0
      ? Number(targetDuration)
      : durations.reduce((s: number, d: number) => s + d, 0);

  // ── Build timeline ─────────────────────────────────────────────────────────
  let cursor = 0;
  const videoClips = clips.map(
    (clip: { url: string; thumbnail?: string; duration?: number }, i: number) => {
      const d = durations[i];
      const clipObj = {
        id: `reel_clip_${i}_${Date.now()}`,
        url: clip.url,
        thumbnail: clip.thumbnail || clip.url,
        start_time: cursor,
        duration: d,
        ...(i > 0 ? { transition: { type: transition, duration: 0.3 } } : {}),
      };
      cursor += d;
      return clipObj;
    }
  );

  const tracks = [
    { id: "video_track", type: "video", clips: videoClips },
    ...(musicUrl
      ? [{
          id: "music_track",
          type: "audio",
          clips: [{
            id: "music_clip_0",
            url: musicUrl,
            start_time: 0,
            duration: totalDuration,
            volume: 0.4,
            ...(musicStartTime > 0 ? { trim_start: musicStartTime } : {}),
          }],
        }]
      : []),
  ];

  const timelineData = { duration: totalDuration, tracks };

  // ── Create project ─────────────────────────────────────────────────────────
  const admin = adminClient();
  const { data: project, error } = await admin
    .from("projects")
    .insert({
      workspace_id:     workspace.id,
      title:            String(title).trim().slice(0, 80) || "My Reel",
      status:           "ready",
      aspect_ratio:     aspectRatio,
      duration_seconds: totalDuration,
      timeline_data:    timelineData,
    })
    .select()
    .single();

  if (error || !project) {
    return NextResponse.json({ error: error?.message ?? "Failed to create project" }, { status: 500 });
  }

  return NextResponse.json({ projectId: project.id });
}
