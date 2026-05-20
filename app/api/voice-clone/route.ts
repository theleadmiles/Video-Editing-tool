import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const ELEVENLABS_API = "https://api.elevenlabs.io/v1";
const MAX_SAMPLE_SIZE = 25 * 1024 * 1024; // 25MB per sample
const ALLOWED_AUDIO = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
  "audio/mp4", "audio/m4a", "audio/aac", "audio/ogg", "audio/webm",
];

/**
 * Create a voice clone via ElevenLabs Voice Lab.
 * Accepts multipart: `name`, `description?`, `accent?`, `files` (one or more audio samples).
 * Stores the new voice_id in the `assets` table for retrieval.
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
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const incoming = await req.formData();
  const name = String(incoming.get("name") || "").trim();
  const description = String(incoming.get("description") || "").trim();
  const accent = String(incoming.get("accent") || "").trim();
  const files = incoming.getAll("files") as File[];

  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (name.length > 60) return NextResponse.json({ error: "Name too long (max 60 chars)" }, { status: 400 });
  if (files.length === 0) return NextResponse.json({ error: "At least one audio sample required" }, { status: 400 });
  if (files.length > 10) return NextResponse.json({ error: "Max 10 audio samples" }, { status: 400 });

  // Validate samples
  for (const f of files) {
    if (!ALLOWED_AUDIO.includes(f.type)) {
      return NextResponse.json({ error: `Unsupported audio: ${f.type}` }, { status: 400 });
    }
    if (f.size > MAX_SAMPLE_SIZE) {
      return NextResponse.json({ error: `Sample too large: ${f.name}` }, { status: 413 });
    }
  }

  // Forward to ElevenLabs Voice Lab — POST /v1/voices/add (multipart)
  const elForm = new FormData();
  elForm.append("name", name);
  if (description) elForm.append("description", description);
  if (accent) elForm.append("labels", JSON.stringify({ accent }));
  for (const f of files) {
    elForm.append("files", f, f.name);
  }

  let voiceId: string;
  try {
    const res = await fetch(`${ELEVENLABS_API}/voices/add`, {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
      body: elForm,
    });
    if (!res.ok) {
      const errText = await res.text();
      let detail = errText;
      try {
        const errJson = JSON.parse(errText);
        detail = errJson.detail?.message || errJson.detail || errText;
      } catch { /* keep raw */ }
      // Common ElevenLabs failures: needs Creator+ subscription, too many existing voices
      if (res.status === 401) {
        return NextResponse.json({ error: "ElevenLabs API key invalid" }, { status: 502 });
      }
      if (typeof detail === "string" && /subscription|tier|plan/i.test(detail)) {
        return NextResponse.json({
          error: "Voice cloning requires an ElevenLabs Creator plan or higher",
          detail,
        }, { status: 402 });
      }
      return NextResponse.json({ error: "ElevenLabs error", detail }, { status: res.status });
    }
    const data = await res.json();
    voiceId = data.voice_id;
    if (!voiceId) throw new Error("No voice_id in ElevenLabs response");
  } catch (err) {
    console.error("Voice clone error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Clone failed" },
      { status: 500 }
    );
  }

  // Store the first sample in Supabase Storage for reference + record in assets table
  const firstSample = files[0];
  let sampleUrl = "";
  try {
    const buffer = Buffer.from(await firstSample.arrayBuffer());
    const path = `${workspace.id}/voice-clones/${Date.now()}-${firstSample.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await supabase.storage.from("assets").upload(path, buffer, {
      contentType: firstSample.type,
      upsert: false,
    });
    const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
    sampleUrl = urlData.publicUrl;
  } catch { /* non-fatal */ }

  // Save record
  await supabase.from("assets").insert({
    workspace_id: workspace.id,
    type: "audio",
    source: "elevenlabs",
    url: sampleUrl,
    metadata: {
      kind: "voice_clone",
      voice_id: voiceId,
      voice_name: name,
      voice_description: description || null,
      accent: accent || null,
      sample_count: files.length,
      original_name: firstSample.name,
    },
  });

  return NextResponse.json({
    ok: true,
    voice_id: voiceId,
    name,
    description: description || null,
    accent: accent || null,
  });
}

/**
 * List all cloned voices for this workspace.
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
  if (!workspace) return NextResponse.json({ voices: [] });

  const { data } = await supabase
    .from("assets")
    .select("id, url, metadata, created_at")
    .eq("workspace_id", workspace.id)
    .eq("source", "elevenlabs")
    .order("created_at", { ascending: false });

  const voices = (data || [])
    .filter((a) => {
      const m = a.metadata as Record<string, unknown> | null;
      return m?.kind === "voice_clone" && typeof m?.voice_id === "string";
    })
    .map((a) => {
      const m = a.metadata as Record<string, unknown>;
      return {
        asset_id: a.id,
        voice_id: m.voice_id as string,
        name: m.voice_name as string,
        description: (m.voice_description as string) || null,
        accent: (m.accent as string) || null,
        sample_url: a.url,
        created_at: a.created_at,
      };
    });

  return NextResponse.json({ voices });
}

/**
 * Delete a cloned voice both from ElevenLabs and our DB.
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const assetId = searchParams.get("asset_id");
  if (!assetId) return NextResponse.json({ error: "asset_id required" }, { status: 400 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { data: asset } = await supabase
    .from("assets")
    .select("metadata, url, workspace_id")
    .eq("id", assetId)
    .eq("workspace_id", workspace.id)
    .single();
  if (!asset) return NextResponse.json({ error: "Voice not found" }, { status: 404 });

  const meta = asset.metadata as Record<string, unknown>;
  const voiceId = meta?.voice_id as string | undefined;

  // Best-effort: delete from ElevenLabs
  if (voiceId) {
    try {
      await fetch(`${ELEVENLABS_API}/voices/${voiceId}`, {
        method: "DELETE",
        headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
      });
    } catch { /* ignore */ }
  }

  // Remove sample from storage
  try {
    if (asset.url) {
      const url = new URL(asset.url);
      const pathParts = url.pathname.split("/assets/");
      if (pathParts[1]) {
        await supabase.storage.from("assets").remove([pathParts[1]]);
      }
    }
  } catch { /* ignore */ }

  await supabase.from("assets").delete().eq("id", assetId);

  return NextResponse.json({ ok: true });
}
