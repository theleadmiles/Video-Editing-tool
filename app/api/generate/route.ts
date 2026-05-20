import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateScript } from "@/lib/ai/claude";
import { generateVoiceover } from "@/lib/ai/elevenlabs";
import { fetchBrollForSections } from "@/lib/ai/pexels";
import { getMusicByMood } from "@/lib/ai/pixabay";
import { generateCaptions } from "@/lib/ai/whisper";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const body = await req.json();
  const {
    topic,
    voiceId = "21m00Tcm4TlvDq8ikWAM",
    musicMood = "upbeat",
    durationSeconds = 45,
    aspectRatio = "9:16",
    tone = "energetic",
    language = "English",
  } = body;

  if (!topic) {
    return new Response(JSON.stringify({ error: "Topic is required" }), { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      let projectId: string | null = null;

      try {
        // Auth + workspace check
        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id, credits_remaining")
          .eq("owner_id", user.id)
          .single();

        if (!workspace) {
          send("error", { message: "Workspace not found" });
          controller.close();
          return;
        }

        if (workspace.credits_remaining <= 0) {
          send("error", { message: "No credits remaining. Please upgrade your plan." });
          controller.close();
          return;
        }

        // Create project
        const { data: project, error: projectError } = await supabase
          .from("projects")
          .insert({
            workspace_id: workspace.id,
            title: topic.slice(0, 80),
            status: "generating",
            aspect_ratio: aspectRatio,
          })
          .select()
          .single();

        if (projectError || !project) {
          send("error", { message: "Failed to create project" });
          controller.close();
          return;
        }

        projectId = project.id;

        send("progress", { step: "script", label: "Writing script with AI", percent: 10 });

        const orientationMap: Record<string, "portrait" | "landscape" | "square"> = {
          "9:16": "portrait",
          "16:9": "landscape",
          "1:1": "square",
        };
        const orientation = orientationMap[aspectRatio] || "portrait";

        // Step 1: Script
        const scriptData = await generateScript(topic, durationSeconds, tone, language);
        send("progress", { step: "voiceover", label: "Generating voiceover", percent: 30 });

        // Step 2: Voiceover
        const voiceoverBuffer = await generateVoiceover(scriptData.script, voiceId);
        const voiceoverPath = `${workspace.id}/${project.id}/voiceover.mp3`;
        const { error: uploadError } = await supabase.storage
          .from("assets")
          .upload(voiceoverPath, voiceoverBuffer, { contentType: "audio/mpeg", upsert: true });

        let voiceoverUrl = "";
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("assets").getPublicUrl(voiceoverPath);
          voiceoverUrl = urlData.publicUrl;
        }

        send("progress", { step: "broll", label: "Fetching B-roll footage", percent: 55 });

        // Step 3: B-roll
        const brollClips = await fetchBrollForSections(scriptData.sections, orientation);
        send("progress", { step: "music", label: "Finding background music", percent: 70 });

        // Step 4: Music
        const music = await getMusicByMood(musicMood);
        send("progress", { step: "captions", label: "Generating captions", percent: 82 });

        // Step 5: Captions
        let captions: { text: string; start: number; end: number }[] = [];
        try {
          captions = await generateCaptions(voiceoverBuffer);
        } catch {
          captions = scriptData.sections.map((s, i) => ({
            text: s.text,
            start: i * (durationSeconds / scriptData.sections.length),
            end: (i + 1) * (durationSeconds / scriptData.sections.length),
          }));
        }

        send("progress", { step: "assembling", label: "Assembling your video", percent: 93 });

        // Step 6: Build timeline
        const timelineData = buildTimeline({
          brollClips,
          voiceoverUrl,
          captions,
          music,
          durationSeconds,
          aspectRatio,
          title: scriptData.title,
          language,
          tone,
          musicMood,
        });

        // Save assets
        const assetInserts = brollClips.map((clip) => ({
          workspace_id: workspace.id,
          type: "video" as const,
          source: "pexels" as const,
          url: clip.url,
          duration_seconds: clip.duration,
          metadata: { thumbnail: clip.thumbnail, query: clip.query },
        }));
        if (assetInserts.length > 0) {
          await supabase.from("assets").insert(assetInserts);
        }

        // Save project (include first B-roll thumbnail as the project thumbnail)
        const firstThumbnail = brollClips[0]?.thumbnail || null;
        await supabase
          .from("projects")
          .update({
            title: scriptData.title,
            script: scriptData.script,
            duration_seconds: durationSeconds,
            status: "ready",
            timeline_data: timelineData,
            thumbnail_url: firstThumbnail,
          })
          .eq("id", project.id);

        // Deduct credit
        await supabase
          .from("workspaces")
          .update({ credits_remaining: workspace.credits_remaining - 1 })
          .eq("id", workspace.id);

        // Log
        await supabase.from("ai_generations").insert({
          user_id: user.id,
          project_id: project.id,
          type: "script",
          provider: "claude",
          cost_usd: 0.01,
          credits_used: 1,
        });

        send("done", { projectId: project.id, title: scriptData.title });
      } catch (err) {
        console.error("Generation error:", err);
        // Reset project to "draft" so user can see it failed and retry
        if (projectId) {
          await supabase
            .from("projects")
            .update({ status: "draft" })
            .eq("id", projectId);
        }
        send("error", { message: err instanceof Error ? err.message : "Generation failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function buildTimeline({
  brollClips,
  voiceoverUrl,
  captions,
  music,
  durationSeconds,
  aspectRatio,
  title,
  language = "English",
  tone = "energetic",
  musicMood = "upbeat",
}: {
  brollClips: { url: string; thumbnail: string; duration: number }[];
  voiceoverUrl: string;
  captions: { text: string; start: number; end: number }[];
  music: { url: string; title: string } | null;
  durationSeconds: number;
  aspectRatio: string;
  title: string;
  language?: string;
  tone?: string;
  musicMood?: string;
}) {
  let currentTime = 0;

  const videoClips = brollClips.map((clip) => {
    const clipStart = currentTime;
    currentTime += clip.duration;
    return {
      id: `clip_${clipStart}`,
      url: clip.url,
      thumbnail: clip.thumbnail,
      start_time: clipStart,
      duration: clip.duration,
    };
  });

  const captionClips = captions.map((cap, i) => ({
    id: `cap_${i}`,
    text: cap.text,
    start_time: cap.start,
    duration: cap.end - cap.start,
    font_family: "Inter",
    font_size: 36,
    color: "#FFFFFF",
    animation: "fade",
    position: { x: 50, y: 80 },
  }));

  return {
    aspect_ratio: aspectRatio,
    duration: durationSeconds,
    title,
    language,
    tone,
    music_mood: musicMood,
    tracks: [
      { id: "video_track", type: "video", clips: videoClips },
      {
        id: "voiceover_track",
        type: "audio",
        clips: [{ id: "voiceover", url: voiceoverUrl, start_time: 0, duration: durationSeconds, volume: 1 }],
      },
      ...(music
        ? [{
            id: "music_track",
            type: "audio",
            clips: [{ id: "music", url: music.url, start_time: 0, duration: durationSeconds, volume: 0.2 }],
          }]
        : []),
      { id: "caption_track", type: "text", clips: captionClips },
    ],
  };
}
