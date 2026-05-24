import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openrouter, OR_MODEL } from "@/lib/ai/openrouter";
import type { TimelineClip } from "@/types";

/**
 * POST /api/captions/hook
 *
 * Identifies the best 15-second "viral hook" window in the captions.
 *
 * Body: { clips: TimelineClip[] }
 * Returns: { clips: TimelineClip[], reason: string, start_time: number, end_time: number }
 */
export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      {
        error:
          "OpenRouter API key not configured. Add OPENROUTER_API_KEY to .env.local and restart the dev server.",
      },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { clips: TimelineClip[] };
  const { clips } = body;

  if (!Array.isArray(clips) || clips.length === 0) {
    return NextResponse.json({ error: "clips array required" }, { status: 400 });
  }

  // Build a numbered list for the AI
  const captionList = clips
    .map(
      (c, i) =>
        `[${i}] start=${c.start_time.toFixed(2)}s end=${(c.start_time + c.duration).toFixed(2)}s text="${c.text}"`
    )
    .join("\n");

  const system = `You are a viral content strategist who identifies the most compelling 15-second clip windows in video transcripts.
A great viral hook contains one or more of: a surprising stat, a bold claim, an emotional peak, a strong CTA, or a curiosity gap.
Return ONLY valid JSON, no explanation outside the JSON.`;

  const userMsg = `Analyse these caption clips and find the single best contiguous 15-second window with the highest viral potential.

${captionList}

Return this exact JSON:
{
  "start_clip_index": <number>,
  "end_clip_index": <number>,
  "reason": "<one sentence explaining why this window is the best hook>"
}

Rules:
- The window from start_clip_index to end_clip_index (inclusive) must span approximately 15 seconds
- Choose the window with the most emotional or informational impact
- start_clip_index and end_clip_index must be valid indices into the provided list`;

  try {
    const completion = await openrouter.chat.completions.create({
      model: OR_MODEL,
      max_tokens: 300,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    const result = JSON.parse(jsonMatch[0]) as {
      start_clip_index: number;
      end_clip_index: number;
      reason: string;
    };

    const startIdx = Math.max(0, Math.min(result.start_clip_index, clips.length - 1));
    const endIdx = Math.max(startIdx, Math.min(result.end_clip_index, clips.length - 1));

    const selectedClips = clips.slice(startIdx, endIdx + 1);
    const startTime = clips[startIdx].start_time;
    const lastClip = clips[endIdx];
    const endTime = lastClip.start_time + lastClip.duration;

    return NextResponse.json({
      clips: selectedClips,
      reason: result.reason,
      start_time: startTime,
      end_time: endTime,
    });
  } catch (err) {
    console.error("[captions/hook] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Hook detection failed" }, { status: 500 });
  }
}
