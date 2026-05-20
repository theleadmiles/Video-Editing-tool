import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

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

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
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

  const content = message.content[0];
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected AI response" }, { status: 500 });
  }

  return NextResponse.json({ improvedScript: content.text.trim() });
}
