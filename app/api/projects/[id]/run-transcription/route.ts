import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const maxDuration = 30;

// AssemblyAI language codes — English and Hindi are fully supported.
// For other Indian languages we enable auto-detection so AssemblyAI picks the best model.
const ASSEMBLYAI_CODES: Record<string, string> = {
  English: "en",
  Hindi:   "hi",
};

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * POST /api/projects/[id]/run-transcription
 *
 * Submits the audio to AssemblyAI and returns in ~2 seconds.
 * The status-polling endpoint (/api/projects/[id]/status) checks AssemblyAI
 * every 3 seconds and finalises the project when transcription is complete.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const { audioUrl, videoUrl, languageName, aspectRatio, workspaceId } = await req.json();

  const admin = adminClient();

  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) throw new Error("ASSEMBLYAI_API_KEY is not set in Vercel environment variables");

    // Check if a job was already submitted (e.g. user refreshed mid-processing)
    const { data: project } = await admin
      .from("projects")
      .select("timeline_data")
      .eq("id", projectId)
      .single();

    const existing = project?.timeline_data as { _pending?: { assemblyai_id?: string } } | null;
    if (existing?._pending?.assemblyai_id) {
      console.log(`[run-transcription] job already submitted: ${existing._pending.assemblyai_id}`);
      return NextResponse.json({ ok: true, reused: true });
    }

    // Submit to AssemblyAI — returns immediately with a transcript ID
    console.log(`[run-transcription] submitting ${audioUrl} to AssemblyAI`);

    const langCode = ASSEMBLYAI_CODES[languageName];
    const submitBody: Record<string, unknown> = {
      audio_url:    audioUrl,
      speech_models: ["universal-2"], // AssemblyAI current API — plural, array
    };
    if (langCode) {
      submitBody.language_code = langCode;
    } else {
      submitBody.language_detection = true;
    }

    const submitRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method:  "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify(submitBody),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text();
      throw new Error(`AssemblyAI submit failed: HTTP ${submitRes.status} — ${errText}`);
    }

    const { id: assemblyai_id } = await submitRes.json() as { id: string };
    console.log(`[run-transcription] AssemblyAI job submitted: ${assemblyai_id}`);

    // Store job details in timeline_data so the status poller can pick it up
    await admin.from("projects").update({
      timeline_data: {
        _pending: { assemblyai_id, videoUrl, aspectRatio, workspaceId },
      },
    }).eq("id", projectId);

    return NextResponse.json({ ok: true, assemblyai_id });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[run-transcription] FAILED project=${projectId}:`, err);
    await admin.from("projects").update({
      status:        "error",
      timeline_data: { error: msg },
    }).eq("id", projectId);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
