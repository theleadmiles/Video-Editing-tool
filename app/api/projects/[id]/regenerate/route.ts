import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateScript } from "@/lib/ai/claude";
import { generateVoiceover } from "@/lib/ai/elevenlabs";
import { fetchBrollForSections } from "@/lib/ai/pexels";
import { getMusicByMood } from "@/lib/ai/pixabay";
import { generateCaptions } from "@/lib/ai/whisper";

export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { voiceId = "21m00Tcm4TlvDq8ikWAM", musicMood: bodyMusicMood } = body;

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, credits_remaining")
    .eq("owner_id", user.id)
    .single();

  if (!workspace || workspace.credits_remaining <= 0) {
    return NextResponse.json({ error: "No credits remaining" }, { status: 402 });
  }

  // Read previously stored settings from timeline_data — fall back to safe defaults
  const storedTimeline = project.timeline_data as Record<string, unknown> | null;
  const language = (storedTimeline?.language as string) || "English";
  const tone = (storedTimeline?.tone as string) || "energetic";
  const musicMood = bodyMusicMood || (storedTimeline?.music_mood as string) || "upbeat";

  // Mark as generating
  await supabase.from("projects").update({ status: "generating" }).eq("id", id);

  const orientation = (
    { "9:16": "portrait", "16:9": "landscape", "1:1": "square" } as Record<string, "portrait" | "landscape" | "square">
  )[project.aspect_ratio] || "portrait";

  const topic = project.title || "video";
  const duration = project.duration_seconds || 45;

  try {
    const scriptData = await generateScript(topic, duration, tone, language);
    const voiceBuffer = await generateVoiceover(scriptData.script, voiceId);

    const voiceoverPath = `${workspace.id}/${id}/voiceover.mp3`;
    await supabase.storage.from("assets").upload(voiceoverPath, voiceBuffer, { contentType: "audio/mpeg", upsert: true });
    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(voiceoverPath);
    const voiceoverUrl = urlData.publicUrl;

    const brollClips = await fetchBrollForSections(scriptData.sections, orientation);
    const music = await getMusicByMood(musicMood);

    let captions: { text: string; start: number; end: number }[] = [];
    try {
      captions = await generateCaptions(voiceBuffer);
    } catch {
      captions = scriptData.sections.map((s, i) => ({
        text: s.text,
        start: i * (duration / scriptData.sections.length),
        end: (i + 1) * (duration / scriptData.sections.length),
      }));
    }

    let currentTime = 0;
    const timelineData = {
      aspect_ratio: project.aspect_ratio,
      duration,
      title: scriptData.title,
      language,
      tone,
      music_mood: musicMood,
      tracks: [
        {
          id: "video_track", type: "video",
          clips: brollClips.map((c) => {
            const s = currentTime; currentTime += c.duration;
            return { id: `clip_${s}`, url: c.url, thumbnail: c.thumbnail, start_time: s, duration: c.duration };
          }),
        },
        {
          id: "voiceover_track", type: "audio",
          clips: [{ id: "voiceover", url: voiceoverUrl, start_time: 0, duration, volume: 1 }],
        },
        ...(music ? [{
          id: "music_track", type: "audio",
          clips: [{ id: "music", url: music.url, start_time: 0, duration, volume: 0.2 }],
        }] : []),
        {
          id: "caption_track", type: "text",
          clips: captions.map((cap, i) => ({
            id: `cap_${i}`, text: cap.text, start_time: cap.start,
            duration: cap.end - cap.start, font_family: "Inter", font_size: 36,
            color: "#FFFFFF", animation: "fade", position: { x: 50, y: 80 },
          })),
        },
      ],
    };

    await supabase.from("projects").update({
      title: scriptData.title,
      script: scriptData.script,
      status: "ready",
      timeline_data: timelineData,
      thumbnail_url: brollClips[0]?.thumbnail || null,
    }).eq("id", id);

    await supabase.from("workspaces").update({
      credits_remaining: workspace.credits_remaining - 1,
    }).eq("id", workspace.id);

    return NextResponse.json({ ok: true, title: scriptData.title });
  } catch (err) {
    console.error("Regenerate error:", err);
    // Reset to draft so the project isn't stuck in "generating"
    await supabase.from("projects").update({ status: "draft" }).eq("id", id);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Regeneration failed" },
      { status: 500 }
    );
  }
}
