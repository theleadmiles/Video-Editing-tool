import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * DELETE /api/cron/cleanup-videos
 * Runs daily via Vercel cron (see vercel.json).
 * Finds all caption source videos older than 30 days → deletes from storage + DB.
 * The project and its captions are kept — only the raw video file is removed.
 */
export async function GET(req: NextRequest) {
  // Verify this is a legitimate Vercel cron call
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  // Find all caption source videos whose expiry has passed
  const { data: expired, error } = await supabase
    .from("assets")
    .select("id, url, metadata")
    .eq("type", "video")
    .eq("source", "uploaded");

  if (error) {
    console.error("Cleanup query failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();
  const toDelete = (expired ?? []).filter((a) => {
    const m = a.metadata as Record<string, unknown> | null;
    if (m?.kind !== "caption_source") return false;
    const exp = m?.expires_at as string | undefined;
    if (!exp) return false;
    return new Date(exp) < now;
  });

  if (toDelete.length === 0) {
    return NextResponse.json({ deleted: 0, message: "Nothing to clean up" });
  }

  let deleted = 0;
  const errors: string[] = [];

  for (const asset of toDelete) {
    try {
      // Remove file from Supabase Storage
      if (asset.url) {
        const url    = new URL(asset.url);
        const parts  = url.pathname.split("/assets/");
        const path   = parts[1];
        if (path) {
          await supabase.storage.from("assets").remove([path]);
        }
      }

      // Remove the asset DB row
      await supabase.from("assets").delete().eq("id", asset.id);
      deleted++;
    } catch (err) {
      errors.push(`${asset.id}: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  console.log(`Cleanup: deleted ${deleted} expired caption videos`);
  return NextResponse.json({ deleted, errors: errors.length ? errors : undefined });
}
