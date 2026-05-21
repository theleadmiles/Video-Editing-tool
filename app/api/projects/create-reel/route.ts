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
    title       = "My Reel",
    clips       = [] as { url: string; thumbnail?: string; duration?: number }[],
    musicMood   = "upbeat",
    clipDuration = 3,   // seconds each clip plays
    transition  = "cut", // "cut" | "fade"
    aspectRatio = "9:16",
  } = body;

  if (!clips.length) {
    return NextResponse.json({ error: "No clips provided" }, { status: 400 });
  }

  // ── Fetch music ────────────────────────────────────────────────────────────
  let musicUrl: string | null = null;
  try {
    const music = await getMusicByMood(musicMood);
    musicUrl = music?.url ?? null;
  } catch { /* music is optional */ }

  // ── Build timeline ─────────────────────────────────────────────────────────
  const dur = Number(clipDuration) || 3;
  const totalDuration = clips.length * dur;

  const videoClips = clips.map(
    (clip: { url: string; thumbnail?: string; duration?: number }, i: number) => ({
      id: `reel_clip_${i}_${Date.now()}`,
      url: clip.url,
      thumbnail: clip.thumbnail || clip.url,
      start_time: i * dur,
      duration: dur,
      ...(i > 0 ? { transition: { type: transition, duration: 0.3 } } : {}),
    })
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
