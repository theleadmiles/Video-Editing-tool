import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateVoiceover } from "@/lib/ai/elevenlabs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { voiceId } = await req.json();
  if (!voiceId) return NextResponse.json({ error: "voiceId required" }, { status: 400 });

  const { data: project } = await supabase
    .from("projects")
    .select("script, timeline_data, workspace_id")
    .eq("id", id)
    .single();

  if (!project?.script) {
    return NextResponse.json({ error: "Project has no script" }, { status: 400 });
  }

  const buffer = await generateVoiceover(project.script, voiceId);

  const voiceoverPath = `${project.workspace_id}/${id}/voiceover.mp3`;
  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(voiceoverPath, buffer, { contentType: "audio/mpeg", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("assets").getPublicUrl(voiceoverPath);
  const voiceoverUrl = urlData.publicUrl + `?v=${Date.now()}`;

  // Update voiceover URL in timeline_data
  const timeline = project.timeline_data as Record<string, unknown>;
  const tracks = (timeline?.tracks as Array<Record<string, unknown>>) || [];
  const updatedTracks = tracks.map((track) => {
    if ((track as { id: string }).id === "voiceover_track") {
      const clips = (track.clips as Array<Record<string, unknown>>) || [];
      return {
        ...track,
        clips: clips.map((c, i) => i === 0 ? { ...c, url: voiceoverUrl } : c),
      };
    }
    return track;
  });

  await supabase
    .from("projects")
    .update({ timeline_data: { ...timeline, tracks: updatedTracks } })
    .eq("id", id);

  return NextResponse.json({ voiceoverUrl });
}
