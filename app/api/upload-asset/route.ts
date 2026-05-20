import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;  // 25MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB

const ALLOWED_VIDEO = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska"];
const ALLOWED_AUDIO = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/ogg"];
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const kindParam = formData.get("kind") as string | null; // "video" | "audio" | "image"

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Validate type + size
  let kind: "video" | "audio" | "image";
  if (ALLOWED_VIDEO.includes(file.type)) kind = "video";
  else if (ALLOWED_AUDIO.includes(file.type)) kind = "audio";
  else if (ALLOWED_IMAGE.includes(file.type)) kind = "image";
  else return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });

  if (kindParam && kindParam !== kind) {
    return NextResponse.json(
      { error: `Expected ${kindParam} but got ${kind}` },
      { status: 400 }
    );
  }

  const maxSize = kind === "video" ? MAX_VIDEO_SIZE : kind === "audio" ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large. Max: ${maxSize / 1024 / 1024}MB` },
      { status: 413 }
    );
  }

  // Upload to Supabase Storage
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  const path = `${workspace.id}/uploads/${Date.now()}-${cleanName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  // Save record in assets table
  const { data: assetRecord, error: dbError } = await supabase
    .from("assets")
    .insert({
      workspace_id: workspace.id,
      type: kind,
      source: "uploaded",
      url: publicUrl,
      metadata: {
        original_name: file.name,
        size_bytes: file.size,
        mime_type: file.type,
      },
    })
    .select()
    .single();

  if (dbError || !assetRecord) {
    return NextResponse.json({ error: dbError?.message || "DB save failed" }, { status: 500 });
  }

  return NextResponse.json({
    asset: {
      id: assetRecord.id,
      type: kind,
      url: publicUrl,
      name: file.name,
      size: file.size,
    },
  });
}
