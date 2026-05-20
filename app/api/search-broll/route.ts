import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchBroll, getBestVideoFile } from "@/lib/ai/pexels";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query, orientation = "portrait" } = await req.json();
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

  const videos = await searchBroll(query, orientation as "portrait" | "landscape" | "square", 9);

  const clips = videos.map((v) => ({
    id: String(v.id),
    url: getBestVideoFile(v, false), // use SD for speed
    thumbnail: v.image,
    duration: Math.min(v.duration, 10),
  }));

  return NextResponse.json({ clips });
}
