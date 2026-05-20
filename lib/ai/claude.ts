import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface ScriptOutput {
  title: string;
  script: string;
  keywords: string[];
  hook: string;
  sections: { text: string; duration: number; broll_query: string }[];
}

const SCRIPT_SYSTEM_PROMPT = `You are an expert video script writer for short-form social media content (Instagram Reels, YouTube Shorts). You write punchy, engaging scripts that hook viewers in the first 3 seconds and keep them watching.

Return ONLY valid JSON in this exact format:
{
  "title": "catchy video title",
  "hook": "first 1-2 sentences that grab attention (most important)",
  "script": "full voiceover script, natural speaking style, no stage directions",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "sections": [
    { "text": "section text", "duration": 8, "broll_query": "relevant b-roll search term" }
  ]
}

Rules:
- Hook must be punchy and stop the scroll in first 3 seconds
- Script should sound natural when spoken aloud — write for the ear, not the eye
- Keywords are for finding relevant B-roll footage on stock video sites
- Each section maps to one video clip (5–10 seconds each)
- broll_query should be specific and visual (e.g. "person meditating sunrise beach" not "meditation")
- Never include stage directions, timestamps, or speaker labels in the script field
- The full script should be the complete voiceover from start to finish`;

export async function generateScript(
  topic: string,
  durationSeconds: number,
  tone: string = "energetic",
  language: string = "English"
): Promise<ScriptOutput> {
  const wordCount = Math.round((durationSeconds / 60) * 140);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: [
      {
        type: "text" as const,
        text: SCRIPT_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" as const },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Write a ${durationSeconds}-second video script about: "${topic}"

Tone: ${tone}
Language: ${language === "English" ? "English" : `${language} (write the entire script in ${language} — title, hook, script, and section text should all be in ${language})`}
Target word count for voiceover: ~${wordCount} words

Important: Return ONLY the JSON object, no other text.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response from Claude");

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Claude response");

  return JSON.parse(jsonMatch[0]) as ScriptOutput;
}
