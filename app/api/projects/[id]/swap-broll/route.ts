import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clipId, newClip } = await req.json();
  if (!clipId || !newClip) {
    return NextResponse.json({ error: "clipId and newClip required" }, { status: 400 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("timeline_data")
    .eq("id", id)
    .single();

  if (!project?.timeline_data) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const timeline = project.timeline_data as Record<string, unknown>;
  const tracks = (timeline.tracks as Array<Record<string, unknown>>) || [];

  const updatedTracks = tracks.map((track) => {
    if ((track as { id: string }).id === "video_track") {
      const clips = (track.clips as Array<Record<string, unknown>>) || [];
      return {
        ...track,
        clips: clips.map((c) =>
          (c as { id: string }).id === clipId
            ? { ...c, url: newClip.url, thumbnail: newClip.thumbnail }
            : c
        ),
      };
    }
    return track;
  });

  await supabase
    .from("projects")
    .update({ timeline_data: { ...timeline, tracks: updatedTracks } })
    .eq("id", id);

  return NextResponse.json({ ok: true });
}
