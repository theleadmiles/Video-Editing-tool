import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import type { TimelineClip, TimelineData } from "@/types";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const TRANSLATION_SYSTEM_PROMPT = `You are a professional video caption translator for short-form social media content (Reels, Shorts, TikTok). Your job is to translate caption lines from English to a target language.

CRITICAL RULES:
1. Return ONLY a valid JSON array of strings — no other text, no markdown fences, no explanation.
2. The output array MUST have exactly the same length as the input array, in the same order.
3. Translate each line into the target language as a NATIVE speaker would say it on social media — natural, punchy, idiomatic. Not literal.
4. Preserve any *asterisk-wrapped emphasis words* — translate the word inside but keep the *asterisks* exactly. Example: "This is *huge*" → "Ye *bahut bada* hai" (Hindi).
5. Preserve emoji exactly where they appear.
6. Keep the translated line roughly the same length as the original — short enough for caption display.
7. Use the script native to the language (Devanagari for Hindi, Tamil script for Tamil, etc.).
8. Don't add a CTA, hashtags, or commentary that wasn't in the original.

Input format: a JSON array of English caption strings.
Output format: a JSON array of the same length with translated strings.`;

const SUPPORTED_LANGUAGES = [
  "English", "Hindi", "Tamil", "Telugu", "Bengali",
  "Kannada", "Marathi", "Punjabi", "Malayalam", "Gujarati",
  "Spanish", "French", "German", "Portuguese", "Indonesian",
] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const targetLanguage = body.target_language as string;

  if (!targetLanguage || !SUPPORTED_LANGUAGES.includes(targetLanguage as typeof SUPPORTED_LANGUAGES[number])) {
    return NextResponse.json(
      { error: `Unsupported language. Supported: ${SUPPORTED_LANGUAGES.join(", ")}` },
      { status: 400 }
    );
  }

  const { data: project } = await supabase
    .from("projects")
    .select("timeline_data, workspace_id")
    .eq("id", id)
    .single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const timeline = project.timeline_data as TimelineData | null;
  const captionTrack = timeline?.tracks?.find((t) => t.type === "text");
  if (!captionTrack || captionTrack.clips.length === 0) {
    return NextResponse.json({ error: "Project has no captions" }, { status: 400 });
  }

  const captionTexts = captionTrack.clips.map((c) => String(c.text || ""));

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: [
        {
          type: "text" as const,
          text: TRANSLATION_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" as const },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Translate the following English captions into ${targetLanguage}.

Input captions (${captionTexts.length} lines):
${JSON.stringify(captionTexts, null, 2)}

Return ONLY the JSON array of translated strings.`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected Claude response");

    // Extract JSON array
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in Claude response");
    const translated = JSON.parse(jsonMatch[0]) as string[];

    if (!Array.isArray(translated) || translated.length !== captionTexts.length) {
      throw new Error(`Length mismatch: got ${translated.length}, expected ${captionTexts.length}`);
    }

    // Apply translations to captions (preserve all other fields)
    const updatedClips: TimelineClip[] = captionTrack.clips.map((c, i) => ({
      ...c,
      text: translated[i],
    }));

    const updatedTimeline: TimelineData = {
      ...timeline!,
      tracks: timeline!.tracks.map((t) =>
        t.type === "text" ? { ...t, clips: updatedClips } : t
      ),
    };

    await supabase
      .from("projects")
      .update({ timeline_data: updatedTimeline })
      .eq("id", id);

    return NextResponse.json({
      ok: true,
      target_language: targetLanguage,
      caption_count: translated.length,
      timeline_data: updatedTimeline,
      cache_read_input_tokens: message.usage?.cache_read_input_tokens || 0,
    });
  } catch (err) {
    console.error("Translation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Translation failed" },
      { status: 500 }
    );
  }
}
