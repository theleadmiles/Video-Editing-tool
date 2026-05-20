import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: original } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: copy, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: original.workspace_id,
      title: `Copy of ${original.title}`,
      script: original.script,
      duration_seconds: original.duration_seconds,
      aspect_ratio: original.aspect_ratio,
      status: original.status,
      timeline_data: original.timeline_data,
      thumbnail_url: original.thumbnail_url,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ projectId: copy.id });
}
