import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openrouter, OR_MODEL } from "@/lib/ai/openrouter";
import type { TimelineClip } from "@/types";

/**
 * POST /api/captions/correct
 *
 * AI-corrects transcript errors — misheard proper nouns, brand names,
 * technical terms, and speech-to-text hallucinations.
 *
 * Body: { clips: TimelineClip[], context?: string }
 *   context: optional description of video topic / industry to guide correction
 * Returns: { clips: TimelineClip[] }
 */
export async function POST(req: NextRequest) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OpenRouter API key not configured. Add OPENROUTER_API_KEY to .env.local and restart the dev server." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    clips:    TimelineClip[];
    context?: string;
  };

  const { clips, context } = body;
  if (!Array.isArray(clips) || clips.length === 0) {
    return NextResponse.json({ error: "clips array required" }, { status: 400 });
  }

  const payload = clips.map((c) => ({ id: c.id, text: String(c.text || "") }));

  const contextNote = context
    ? `Video context: ${context}`
    : "No context provided — use general knowledge to fix obvious errors.";

  const system = `You are a professional transcript corrector for short-form video captions. Auto-transcription often mishears words — especially proper nouns, brand names, technical terms, and names.

RULES:
- Fix spelling errors, grammar mistakes, and misheard words
- Fix capitalisation of proper nouns, brands, and names
- Do NOT rewrite sentences — only fix clear errors
- Preserve *emphasis markers* exactly as they are
- Keep each clip approximately the same length (don't add or remove ideas)
- If a clip looks correct, return it unchanged
- Return ONLY valid JSON`;

  const userMsg = `${contextNote}

Correct any transcription errors in these caption clips:

${JSON.stringify(payload, null, 2)}

Return this exact JSON:
{
  "clips": [
    { "id": "<same id>", "text": "<corrected text>" }
  ]
}`;

  try {
    const completion = await openrouter.chat.completions.create({
      model:       OR_MODEL,
      max_tokens:  3000,
      temperature: 0.1, // very low — we want conservative corrections
      messages: [
        { role: "system", content: system },
        { role: "user",   content: userMsg },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    const result = JSON.parse(jsonMatch[0]) as {
      clips: { id: string; text: string }[];
    };

    const aiMap = new Map(result.clips.map((c) => [c.id, c.text]));
    const corrected: TimelineClip[] = clips.map((clip) => ({
      ...clip,
      text: aiMap.get(clip.id) ?? clip.text,
    }));

    return NextResponse.json({ clips: corrected });
  } catch (err) {
    console.error("[captions/correct] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Correction failed" }, { status: 500 });
  }
}
