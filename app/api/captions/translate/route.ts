import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openrouter, OR_MODEL } from "@/lib/ai/openrouter";
import type { TimelineClip } from "@/types";

/**
 * POST /api/captions/translate
 *
 * Translates all caption clips to a target language.
 * Timing data is fully preserved — only `text` is replaced.
 * Emphasis markers (*word*) are maintained in the translation.
 *
 * Body: { clips: TimelineClip[], target_language: string }
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
    clips:           TimelineClip[];
    target_language: string;
  };

  const { clips, target_language } = body;
  if (!Array.isArray(clips) || clips.length === 0) {
    return NextResponse.json({ error: "clips array required" }, { status: 400 });
  }
  if (!target_language?.trim()) {
    return NextResponse.json({ error: "target_language required" }, { status: 400 });
  }

  const payload = clips.map((c) => ({ id: c.id, text: String(c.text || "") }));

  const system = `You are a professional subtitle translator specialising in short-form video content. Translate captions faithfully and naturally.

RULES:
- Translate to ${target_language}
- Keep translations concise — subtitles must be readable in 1-3 seconds
- Preserve *emphasis markers* around the translated equivalents of the emphasised words
- Keep approximately the same word count per clip so timing still works
- Maintain the emotional tone of the original
- Return ONLY valid JSON, no prose, no markdown`;

  const userMsg = `Translate these caption clips to ${target_language}:

${JSON.stringify(payload, null, 2)}

Return this exact JSON:
{
  "clips": [
    { "id": "<same id>", "text": "<translated text>" }
  ]
}`;

  try {
    const completion = await openrouter.chat.completions.create({
      model:       OR_MODEL,
      max_tokens:  3000,
      temperature: 0.2,
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
    const translated: TimelineClip[] = clips.map((clip) => ({
      ...clip,
      text: aiMap.get(clip.id) ?? clip.text,
    }));

    return NextResponse.json({ clips: translated });
  } catch (err) {
    console.error("[captions/translate] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Translation failed" }, { status: 500 });
  }
}
