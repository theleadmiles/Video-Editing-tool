import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** PATCH /api/caption-presets/[id] — rename or update a preset */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name?: string;
    brand_tag?: string | null;
    style?: object;
    is_default?: boolean;
  };

  // RLS ensures only the owner's workspace presets can be modified
  const { data: preset, error } = await supabase
    .from("caption_presets")
    .update({
      ...(body.name       !== undefined && { name:       body.name.trim() }),
      ...(body.brand_tag  !== undefined && { brand_tag:  body.brand_tag }),
      ...(body.style      !== undefined && { style:      body.style }),
      ...(body.is_default !== undefined && { is_default: body.is_default }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, name, brand_tag, style, is_default, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preset });
}

/** DELETE /api/caption-presets/[id] — remove a preset */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("caption_presets")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
