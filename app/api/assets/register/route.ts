import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/assets/register
 *
 * Called after a file has been uploaded directly to R2 via a presigned URL.
 * Saves the asset record to the database so it appears in the user's library.
 *
 * Body: { url, type, name, size_bytes, mime_type }
 * Returns: { asset: { id, type, url, name } }
 */
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

  const { url, type, name, size_bytes, mime_type } = await req.json();
  if (!url || !type) return NextResponse.json({ error: "url and type are required" }, { status: 400 });

  const validTypes = ["video", "audio", "image"] as const;
  if (!validTypes.includes(type as (typeof validTypes)[number])) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const { data: asset, error } = await supabase
    .from("assets")
    .insert({
      workspace_id: workspace.id,
      type,
      source: "uploaded",
      url,
      metadata: {
        original_name: name || "upload",
        size_bytes:    size_bytes || 0,
        mime_type:     mime_type || "",
      },
    })
    .select()
    .single();

  if (error || !asset) {
    return NextResponse.json({ error: error?.message || "DB save failed" }, { status: 500 });
  }

  return NextResponse.json({
    asset: {
      id:   asset.id,
      type: asset.type,
      url:  asset.url,
      name: name || "upload",
      size: size_bytes || 0,
    },
  });
}
