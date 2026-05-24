import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openrouter, OR_MODEL } from "@/lib/ai/openrouter";
import type { TimelineClip, CaptionEmotion } from "@/types";

/**
 * POST /api/captions/enhance
 *
 * Runs one or more AI operations over a set of caption clips:
 *   - emphasis:        wrap 1-2 key words per sentence in *asterisks*
 *   - remove_fillers:  strip um/uh/you know/like/basically/literally/right/so
 *   - emotion_styling: tag each clip with an emotion and auto-assign a style
 *
 * Only the text (and optionally emotion) fields change — timings are preserved.
 * Returns { clips: TimelineClip[] } with the requested mutations applied.
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
    clips: TimelineClip[];
    options: {
      emphasis?:       boolean;
      remove_fillers?: boolean;
      emotion_styling?: boolean;
    };
  };

  const { clips, options = {} } = body;
  if (!Array.isArray(clips) || clips.length === 0) {
    return NextResponse.json({ error: "clips array required" }, { status: 400 });
  }

  // Build task description for the model
  const tasks: string[] = [];
  if (options.emphasis)       tasks.push("emphasis: wrap the 1-2 most important/impactful words per clip in *asterisks*. Be selective — only words that carry real weight.");
  if (options.remove_fillers) tasks.push("remove_fillers: remove filler words (um, uh, you know, like, basically, literally, right, so, I mean, kind of, sort of, just) while keeping the meaning intact. Do not add words — only remove.");
  if (options.emotion_styling) tasks.push('emotion: tag each clip with one of: "excited", "calm", "urgent", "funny", or "neutral". Excited = high energy/positive. Urgent = strong call-to-action or warning. Funny = humour/sarcasm. Calm = reflective/educational. Neutral = everything else.');

  if (tasks.length === 0) {
    return NextResponse.json({ clips }); // nothing to do
  }

  // Compact payload — only ids + text, no timing data (saves tokens)
  const payload = clips.map((c) => ({ id: c.id, text: String(c.text || "") }));

  const system = `You are a professional caption editor for short-form video content (TikTok, Reels, Shorts). You enhance auto-generated captions to be more engaging. Follow each task instruction exactly.

IMPORTANT RULES:
- Never change the meaning of what was said
- Never add words (except emphasis markers)
- Keep text concise — captions appear on screen for 1-3 seconds
- Return ONLY valid JSON, no prose, no markdown, no code fences`;

  const userMsg = `Perform these tasks on the caption clips below:\n${tasks.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Caption clips (JSON array):
${JSON.stringify(payload, null, 2)}

Return this exact JSON structure:
{
  "clips": [
    { "id": "<same id>", "text": "<modified text>", "emotion": "<emotion tag if requested, else omit>" }
  ]
}`;

  try {
    const completion = await openrouter.chat.completions.create({
      model:      OR_MODEL,
      max_tokens: 3000,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: userMsg },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    const result = JSON.parse(jsonMatch[0]) as {
      clips: { id: string; text: string; emotion?: string }[];
    };

    // Merge AI changes back into original clips (preserve all timing/style data)
    const aiMap = new Map(result.clips.map((c) => [c.id, c]));
    const enhanced: TimelineClip[] = clips.map((clip) => {
      const ai = aiMap.get(clip.id);
      if (!ai) return clip;

      const updates: Partial<TimelineClip> = { text: ai.text };

      if (ai.emotion && options.emotion_styling) {
        updates.emotion = ai.emotion as CaptionEmotion;
        // Auto-assign style based on emotion
        const emotionStyle = EMOTION_STYLE_MAP[ai.emotion as CaptionEmotion];
        if (emotionStyle) Object.assign(updates, emotionStyle);
      }

      return { ...clip, ...updates };
    });

    return NextResponse.json({ clips: enhanced });
  } catch (err) {
    console.error("[captions/enhance] error:", err);
    return NextResponse.json({ error: "AI enhancement failed" }, { status: 500 });
  }
}

// Emotion → partial clip style overrides
const EMOTION_STYLE_MAP: Record<CaptionEmotion, Partial<TimelineClip>> = {
  excited: {
    font_size:       48,
    font_weight:     900,
    color:           "#FFFFFF",
    stroke_color:    "#000000",
    stroke_width:    6,
    text_transform:  "uppercase",
    animation:       "pop",
  },
  urgent: {
    font_size:       38,
    font_weight:     800,
    color:           "#000000",
    background_css:  "linear-gradient(90deg, #F0A500, #FFB923)",
    bg_padding:      "6px 14px",
    animation:       "slide_up",
    text_transform:  "uppercase",
  },
  calm: {
    font_size:       28,
    font_weight:     400,
    color:           "#FFFFFF",
    stroke_color:    "rgba(0,0,0,0.85)",
    stroke_width:    3,
    animation:       "fade",
  },
  funny: {
    font_size:       46,
    font_weight:     900,
    color:           "#FFE600",
    stroke_color:    "#000000",
    stroke_width:    7,
    animation:       "pop",
  },
  neutral: {
    font_size:       36,
    font_weight:     600,
    color:           "#FFFFFF",
    stroke_color:    "rgba(0,0,0,0.7)",
    stroke_width:    4,
    animation:       "fade",
  },
};
