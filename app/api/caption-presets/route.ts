import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/caption-presets — list all presets for the user's workspace */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!workspace) return NextResponse.json({ presets: [] });

  const { data: presets, error } = await supabase
    .from("caption_presets")
    .select("id, name, brand_tag, style, is_default, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ presets: presets ?? [] });
}

/** POST /api/caption-presets — save a new preset */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const body = await req.json() as {
    name: string;
    brand_tag?: string | null;
    style: object;
    is_default?: boolean;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data: preset, error } = await supabase
    .from("caption_presets")
    .insert({
      workspace_id: workspace.id,
      name:         body.name.trim(),
      brand_tag:    body.brand_tag ?? null,
      style:        body.style,
      is_default:   body.is_default ?? false,
    })
    .select("id, name, brand_tag, style, is_default, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preset }, { status: 201 });
}
