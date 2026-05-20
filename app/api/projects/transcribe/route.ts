import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const maxDuration = 30;

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspaces").select("id").eq("owner_id", user.id).single();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  // ── Parse inputs ───────────────────────────────────────────────────────────
  const form         = await req.formData();
  const audioUrl     = String(form.get("audio_url")    ?? "");
  const videoUrl     = String(form.get("video_url")    ?? "");
  const languageName = String(form.get("language")     ?? "");
  const titleInput   = String(form.get("title")        ?? "");
  const aspectRatio  = String(form.get("aspect_ratio") ?? "9:16") as "9:16" | "16:9" | "1:1" | "4:5";

  if (!audioUrl) return NextResponse.json({ error: "audio_url required" }, { status: 400 });
  if (!videoUrl) return NextResponse.json({ error: "video_url required" }, { status: 400 });

  // ── Create project with "processing" status immediately ────────────────────
  const admin = adminClient();
  const { data: project, error: projectError } = await admin
    .from("projects")
    .insert({
      workspace_id:     workspace.id,
      title:            (titleInput.trim() || "Untitled").slice(0, 80),
      status:           "processing",
      aspect_ratio:     aspectRatio,
      duration_seconds: 0,
      timeline_data:    null,
    })
    .select()
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: projectError?.message ?? "Failed to create project" }, { status: 500 });
  }

  // ── Fire-and-forget: kick off transcription in a separate long-running function ──
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  fetch(`${appUrl}/api/projects/${project.id}/run-transcription`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${process.env.CRON_SECRET}`,
    },
    body: JSON.stringify({ audioUrl, videoUrl, languageName, aspectRatio, workspaceId: workspace.id }),
  }).catch(err => {
    console.error(`[transcribe] failed to kick off run-transcription for ${project.id}:`, err);
  });

  // Return immediately — transcription runs independently
  return NextResponse.json({ projectId: project.id });
}
