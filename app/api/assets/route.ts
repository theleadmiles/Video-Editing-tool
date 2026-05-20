import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// List user's uploaded assets
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // optional filter

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!workspace) return NextResponse.json({ assets: [] });

  let query = supabase
    .from("assets")
    .select("id, type, source, url, duration_seconds, metadata, created_at")
    .eq("workspace_id", workspace.id)
    .eq("source", "uploaded")
    .order("created_at", { ascending: false })
    .limit(60);

  if (type) query = query.eq("type", type);

  const { data } = await query;
  return NextResponse.json({ assets: data || [] });
}

// Delete an asset
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Get workspace + verify asset belongs to user
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { data: asset } = await supabase
    .from("assets")
    .select("id, url, workspace_id")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .single();
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Try to remove from storage (best-effort)
  try {
    const url = new URL(asset.url);
    const pathParts = url.pathname.split("/assets/");
    if (pathParts[1]) {
      await supabase.storage.from("assets").remove([pathParts[1]]);
    }
  } catch { /* ignore */ }

  await supabase.from("assets").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
