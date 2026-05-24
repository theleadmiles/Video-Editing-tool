import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openrouter, OR_MODEL } from "@/lib/ai/openrouter";
import type { TimelineClip } from "@/types";

/**
 * POST /api/captions/emoji
 *
 * Appends a contextually relevant emoji to each caption's text.
 * Neutral/filler clips get no emoji (empty string for those).
 *
 * Body: { clips: TimelineClip[] }
 * Returns: { clips: TimelineClip[] }
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

  const payload = clips.map((c) => ({ id: c.id, text: String(c.text || "") }));

  const system = `You are a social media caption editor who adds expressive emojis to video captions.
Rules:
- Append exactly 1 emoji after the text (with a space before it) only where it genuinely enhances the message
- Filler, neutral, or transitional phrases get an empty emoji string ""
- Never add more than 1 emoji per clip
- Match the emoji to the specific emotion/topic: use 🔥 for excitement, 💡 for insight, 😱 for surprise, 💪 for motivation, etc.
- Return ONLY valid JSON`;

  const userMsg = `Add a single contextual emoji to each caption where appropriate. Return empty string for neutral/filler clips.

${JSON.stringify(payload, null, 2)}

Return this exact JSON:
{
  "clips": [
    { "id": "<same id>", "emoji": "<emoji or empty string>" }
  ]
}`;

  try {
    const completion = await openrouter.chat.completions.create({
      model: OR_MODEL,
      max_tokens: 2000,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    const result = JSON.parse(jsonMatch[0]) as {
      clips: { id: string; emoji: string }[];
    };

    const emojiMap = new Map(result.clips.map((c) => [c.id, c.emoji]));

    const updated: TimelineClip[] = clips.map((clip) => {
      const emoji = emojiMap.get(clip.id);
      if (!emoji) return clip;
      const text = String(clip.text || "");
      return {
        ...clip,
        text: emoji ? `${text} ${emoji}` : text,
      };
    });

    return NextResponse.json({ clips: updated });
  } catch (err) {
    console.error("[captions/emoji] error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || "Emoji generation failed" }, { status: 500 });
  }
}
