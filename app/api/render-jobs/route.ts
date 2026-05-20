import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

/**
 * Render jobs are stored in the existing `assets` table with source="render"
 * so we don't need a new DB migration. Each job is a record of a completed
 * (or in-progress) export — file URL + metadata about format, size, status.
 *
 * GET  /api/render-jobs           — list jobs for current workspace
 * POST /api/render-jobs           — register a new render (after upload)
 * DELETE /api/render-jobs?id=xxx  — delete a render
 */

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!workspace) return NextResponse.json({ renders: [] });

  const { data } = await supabase
    .from("assets")
    .select("id, type, source, url, metadata, created_at")
    .eq("workspace_id", workspace.id)
    .eq("type", "video")
    .order("created_at", { ascending: false })
    .limit(60);

  const renders = (data || [])
    .filter((a) => {
      const m = a.metadata as Record<string, unknown> | null;
      return m?.kind === "render";
    })
    .map((a) => {
      const m = a.metadata as Record<string, unknown>;
      return {
        id: a.id,
        project_id: m.project_id as string,
        project_title: (m.project_title as string) || "Untitled",
        format: (m.format as string) || "mp4",
        size_bytes: (m.size_bytes as number) || 0,
        duration_seconds: (m.duration_seconds as number) || 0,
        aspect_ratio: (m.aspect_ratio as string) || "9:16",
        url: a.url,
        created_at: a.created_at,
      };
    });

  return NextResponse.json({ renders });
}

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
  const projectId = String(form.get("project_id") || "");
  const projectTitle = String(form.get("project_title") || "Untitled");
  const format = String(form.get("format") || "mp4");
  const aspectRatio = String(form.get("aspect_ratio") || "9:16");
  const duration = Number(form.get("duration") || 0);

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!projectId) return NextResponse.json({ error: "project_id required" }, { status: 400 });
  if (file.size > 150 * 1024 * 1024) {
    return NextResponse.json({ error: "Render too large (max 150MB)" }, { status: 413 });
  }

  // Verify the project belongs to this workspace
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id")
    .eq("id", projectId)
    .single();
  if (!project || project.workspace_id !== workspace.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Upload to storage
  const ext = format === "mp4" ? "mp4" : "webm";
  const path = `${workspace.id}/renders/${projectId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(path, buffer, {
      contentType: format === "mp4" ? "video/mp4" : "video/webm",
      upsert: false,
    });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  // Save record
  const { data: assetRecord, error: dbError } = await supabase
    .from("assets")
    .insert({
      workspace_id: workspace.id,
      type: "video",
      source: "ai_generated", // Reusing existing enum; "kind" in metadata distinguishes
      url: publicUrl,
      duration_seconds: duration || null,
      metadata: {
        kind: "render",
        project_id: projectId,
        project_title: projectTitle,
        format,
        aspect_ratio: aspectRatio,
        size_bytes: file.size,
        duration_seconds: duration,
      },
    })
    .select()
    .single();
  if (dbError || !assetRecord) {
    return NextResponse.json({ error: dbError?.message || "DB save failed" }, { status: 500 });
  }

  // Also mark project as exported
  await supabase
    .from("projects")
    .update({ status: "exported", final_video_url: publicUrl })
    .eq("id", projectId);

  return NextResponse.json({
    id: assetRecord.id,
    url: publicUrl,
    format,
    size_bytes: file.size,
  });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { data: asset } = await supabase
    .from("assets")
    .select("url, workspace_id, metadata")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .single();
  if (!asset) return NextResponse.json({ error: "Render not found" }, { status: 404 });

  // Remove file
  try {
    if (asset.url) {
      const url = new URL(asset.url);
      const pathParts = url.pathname.split("/assets/");
      if (pathParts[1]) {
        await supabase.storage.from("assets").remove([pathParts[1]]);
      }
    }
  } catch { /* ignore */ }

  await supabase.from("assets").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
