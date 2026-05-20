import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Film, Zap, Sparkles } from "lucide-react";
import type { TimelineData } from "@/types";

export const metadata = {
  title: "Watch on Boltcut",
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, title, status, duration_seconds, aspect_ratio, timeline_data, script")
    .eq("id", id)
    .in("status", ["ready", "exported"])
    .single();

  if (!project) notFound();

  const timeline = project.timeline_data as TimelineData | null;
  const videoTrack = timeline?.tracks?.find((t) => t.type === "video");
  const firstThumbnail = videoTrack?.clips?.[0]?.thumbnail;
  const totalDuration = timeline?.duration || project.duration_seconds || 45;

  function formatDur(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <Link href="/" className="mb-10 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold-500 to-ember-500">
          <Zap className="h-4 w-4 text-black" />
        </div>
        <span className="font-display text-lg font-bold text-white">Boltcut</span>
      </Link>

      {/* Preview card */}
      <div className="w-full max-w-sm">
        <div className="relative rounded-2xl overflow-hidden border border-border shadow-[0_0_80px_rgba(0,0,0,0.8)]">
          {/* Thumbnail */}
          <div
            className="relative bg-gradient-to-br from-gold-500/10 to-ember-500/10"
            style={{ aspectRatio: project.aspect_ratio === "16:9" ? "16/9" : project.aspect_ratio === "1:1" ? "1/1" : "9/16" }}
          >
            {firstThumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={firstThumbnail}
                alt={`${project.title} preview thumbnail`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <Film className="h-16 w-16 text-white/20" aria-hidden="true" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

            {/* Boltcut badge — not a fake play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/90 backdrop-blur border border-white/20 shadow-glow-gold">
                <Sparkles className="h-6 w-6 text-black" />
              </div>
            </div>

            {/* Duration */}
            <div className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-1">
              <span className="text-xs font-bold text-white">{formatDur(totalDuration)}</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-5 text-center">
          <h1 className="font-display text-xl font-bold text-white">{project.title}</h1>
          <p className="mt-1 text-sm text-subtle">
            {project.aspect_ratio} · {formatDur(totalDuration)} · Made with Boltcut AI
          </p>

          {project.script && (
            <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Script preview</p>
              <p className="text-sm text-subtle leading-relaxed line-clamp-4">
                {project.script}
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/projects/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-ember-500 px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
            >
              <Zap className="h-4 w-4" />
              Create your own video free
            </Link>
            <Link
              href="/"
              className="text-xs text-muted hover:text-white transition-colors"
            >
              Learn about Boltcut →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
