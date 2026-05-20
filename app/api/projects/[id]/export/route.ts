import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, script, timeline_data, aspect_ratio, duration_seconds, status")
    .eq("id", id)
    .single();

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const exportData = {
    boltcut_version: "1.0",
    exported_at: new Date().toISOString(),
    project: {
      id: project.id,
      title: project.title,
      script: project.script,
      aspect_ratio: project.aspect_ratio,
      duration_seconds: project.duration_seconds,
      timeline: project.timeline_data,
    },
  };

  const json = JSON.stringify(exportData, null, 2);

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="boltcut-${project.title?.replace(/[^a-z0-9]/gi, "-").toLowerCase() || id}.json"`,
    },
  });
}
