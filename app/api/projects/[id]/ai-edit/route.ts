import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openrouter, OR_MODEL } from "@/lib/ai/openrouter";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { instruction } = await req.json();
  if (!instruction) return NextResponse.json({ error: "instruction required" }, { status: 400 });

  const { data: project } = await supabase
    .from("projects")
    .select("script, title")
    .eq("id", id)
    .single();

  if (!project?.script) {
    return NextResponse.json({ error: "No script found" }, { status: 400 });
  }

  const completion = await openrouter.chat.completions.create({
    model: OR_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an expert video script editor for short-form social media content.

Current script:
"""
${project.script}
"""

Editor instruction: "${instruction}"

Rewrite the script applying the instruction precisely. Keep a similar length and natural spoken style. Return ONLY the improved script text — no explanations, no JSON, no formatting. Just the script.`,
      },
    ],
  });

  const improved = completion.choices[0]?.message?.content?.trim() ?? "";
  if (!improved) {
    return NextResponse.json({ error: "Unexpected AI response" }, { status: 500 });
  }

  return NextResponse.json({ improvedScript: improved });
}
