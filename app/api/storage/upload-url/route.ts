import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/storage/upload-url
 * Returns a signed upload URL so the browser can upload large files
 * directly to Supabase Storage — completely bypassing Vercel's body limit.
 *
 * Body: { filename: string, content_type: string }
 * Returns: { signed_url, path, token, public_url }
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

  const { filename, content_type } = await req.json();
  if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const path = `${workspace.id}/videos/${Date.now()}-${safe}`;

  const { data, error } = await supabase.storage
    .from("assets")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Could not create upload URL" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);

  return NextResponse.json({
    signed_url: data.signedUrl,
    path,
    token: data.token,
    public_url: urlData.publicUrl,
  });
}
