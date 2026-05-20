"use client";

import Link from "next/link";
import { Monitor, ArrowLeft, Download, Share2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { toast } from "sonner";
import type { Project, TimelineData } from "@/types";

interface Props {
  project: Project;
}

export function MobileEditorBlocker({ project }: Props) {
  const timeline = project.timeline_data as TimelineData | null;
  const duration = timeline?.duration || project.duration_seconds || 0;

  async function copyShareLink() {
    const url = `${window.location.origin}/share/${project.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied!");
    } catch {
      toast.error("Couldn't copy — long-press the link instead");
    }
  }

  return (
    <div className="md:hidden flex min-h-screen flex-col bg-base">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-sm text-subtle hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
        <Badge variant={project.status === "ready" || project.status === "exported" ? "default" : "secondary"} className="capitalize">
          {project.status}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        {/* Project thumbnail card */}
        {project.thumbnail_url && (
          <div className="mb-6 relative w-full max-w-xs overflow-hidden rounded-2xl border border-border shadow-card">
            <div
              className="bg-elevated"
              style={{
                aspectRatio:
                  project.aspect_ratio === "16:9" ? "16/9" :
                  project.aspect_ratio === "1:1" ? "1/1" : "9/16",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.thumbnail_url}
                alt={`${project.title} thumbnail`}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <span className="text-[10px] font-medium text-white bg-black/60 rounded px-1.5 py-0.5">
                {project.aspect_ratio}
              </span>
              {duration > 0 && (
                <span className="text-[10px] font-medium text-white bg-black/60 rounded px-1.5 py-0.5">
                  {formatDuration(duration)}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/15">
          <Monitor className="h-7 w-7 text-gold-500" />
        </div>

        <h1 className="font-display text-xl font-bold text-white max-w-xs">
          {project.title || "Untitled project"}
        </h1>
        <p className="mt-3 max-w-xs text-sm text-subtle leading-relaxed">
          The full editor needs a wider screen. Open Boltcut on a laptop or desktop to edit your script, voice, B-roll, and captions.
        </p>

        {/* Lightweight mobile actions */}
        <div className="mt-8 w-full max-w-xs space-y-2">
          {(project.status === "ready" || project.status === "exported") && (
            <>
              <Button className="w-full" onClick={copyShareLink}>
                <Share2 className="h-4 w-4" />
                Copy share link
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/share/${project.id}`}>
                  <Copy className="h-4 w-4" />
                  Open share page
                </Link>
              </Button>
            </>
          )}
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/projects">Back to projects</Link>
          </Button>
        </div>

        <p className="mt-8 flex items-center gap-1.5 text-xs text-muted">
          <Download className="h-3 w-3" />
          Exporting a video requires the desktop editor
        </p>
      </div>
    </div>
  );
}
