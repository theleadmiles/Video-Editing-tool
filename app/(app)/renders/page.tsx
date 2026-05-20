"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatRelativeTime, formatDuration, formatFileSize, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Film, Download, Share2, Trash2, Search, Smartphone, Zap, FolderOpen, Play,
} from "lucide-react";

interface Render {
  id: string;
  project_id: string;
  project_title: string;
  format: "mp4" | "webm";
  size_bytes: number;
  duration_seconds: number;
  aspect_ratio: string;
  url: string;
  created_at: string;
}

const FORMAT_FILTERS = ["All", "MP4", "WebM"] as const;
type FormatFilter = (typeof FORMAT_FILTERS)[number];

export default function RendersPage() {
  const [renders, setRenders] = useState<Render[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FormatFilter>("All");
  const [pendingDelete, setPendingDelete] = useState<Render | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/render-jobs");
      const data = await res.json();
      setRenders(data.renders || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return renders.filter((r) => {
      const matchesFormat =
        filter === "All" ||
        (filter === "MP4" && r.format === "mp4") ||
        (filter === "WebM" && r.format === "webm");
      const matchesSearch = !search.trim() ||
        r.project_title.toLowerCase().includes(search.toLowerCase());
      return matchesFormat && matchesSearch;
    });
  }, [renders, filter, search]);

  function countOf(f: FormatFilter) {
    if (f === "All") return renders.length;
    return renders.filter((r) =>
      (f === "MP4" && r.format === "mp4") || (f === "WebM" && r.format === "webm")
    ).length;
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/render-jobs?id=${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRenders((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      toast.success("Render deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  async function copyShareLink(r: Render) {
    try {
      await navigator.clipboard.writeText(r.url);
      toast.success("Direct link copied!");
    } catch {
      toast.error("Couldn't copy — long-press the link instead");
    }
  }

  function downloadRender(r: Render) {
    const a = document.createElement("a");
    a.href = r.url;
    a.download = `${r.project_title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.${r.format}`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <Film className="h-6 w-6 text-gold-500" />
            Renders
          </h1>
          <p className="mt-1 text-sm text-subtle">
            All your exported videos — download, share, or re-export
          </p>
        </div>
      </div>

      {/* Search + filter */}
      {renders.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search by project title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search renders"
              className="w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-muted focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter by format">
            {FORMAT_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  filter === f
                    ? "border-gold-500/50 bg-gold-500/10 text-gold-500"
                    : "border-border text-subtle hover:text-white"
                )}
              >
                {f === "MP4" && <Smartphone className="h-3 w-3" />}
                {f === "WebM" && <Zap className="h-3 w-3" />}
                {f}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                  filter === f ? "bg-gold-500/20" : "bg-elevated text-muted"
                )}>
                  {countOf(f)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface h-44 skeleton" />
          ))}
        </div>
      ) : renders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500/10">
            <FolderOpen className="h-7 w-7 text-gold-500" />
          </div>
          <h3 className="font-display text-lg font-semibold text-white">No renders yet</h3>
          <p className="mt-1.5 max-w-sm text-sm text-subtle leading-relaxed">
            Export any project with the &ldquo;Save to cloud library&rdquo; option on, and it will appear here for one-click sharing later.
          </p>
          <Button className="mt-5" asChild>
            <Link href="/projects">
              Open a project to export
            </Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-16 text-center">
          <Search className="mb-3 h-10 w-10 text-muted" aria-hidden="true" />
          <h3 className="font-semibold text-white">No renders match</h3>
          <p className="mt-1 text-sm text-subtle">Try a different search or filter.</p>
          <button
            onClick={() => { setSearch(""); setFilter("All"); }}
            className="mt-3 text-xs text-gold-500 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="group rounded-2xl border border-border bg-surface overflow-hidden hover:border-gold-500/30 transition-all hover:-translate-y-0.5 shadow-card hover:shadow-card-hover"
            >
              {/* Video preview */}
              <div className="relative aspect-video bg-elevated overflow-hidden">
                <video
                  src={r.url}
                  className="absolute inset-0 h-full w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                  onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                  onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                {/* Top-left format badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <Badge
                    variant={r.format === "mp4" ? "default" : "secondary"}
                    className="text-[9px] uppercase gap-1"
                  >
                    {r.format === "mp4" ? <Smartphone className="h-2.5 w-2.5" /> : <Zap className="h-2.5 w-2.5" />}
                    {r.format}
                  </Badge>
                </div>

                {/* Top-right aspect + duration */}
                <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                  <Badge variant="secondary" className="text-[9px]">{r.aspect_ratio}</Badge>
                  {r.duration_seconds > 0 && (
                    <span className="text-[9px] font-mono font-medium text-white bg-black/60 rounded px-1.5 py-0.5">
                      {formatDuration(r.duration_seconds)}
                    </span>
                  )}
                </div>

                {/* Centre play indicator */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/90 shadow-glow-gold">
                    <Play className="h-5 w-5 text-black ml-0.5 fill-current" />
                  </div>
                </div>
              </div>

              {/* Info + actions */}
              <div className="p-3">
                <h3 className="font-semibold text-white text-sm line-clamp-1">
                  {r.project_title}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted">
                  <span>{formatFileSize(r.size_bytes)}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(r.created_at)}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => downloadRender(r)}
                    aria-label="Download"
                    title="Download"
                    className="flex items-center justify-center gap-1 rounded-lg border border-gold-500/30 bg-gold-500/5 py-1.5 text-[10px] text-gold-400 hover:bg-gold-500/10 transition-all"
                  >
                    <Download className="h-3 w-3" /> Save
                  </button>
                  <button
                    onClick={() => copyShareLink(r)}
                    aria-label="Copy direct link"
                    title="Copy direct link"
                    className="flex items-center justify-center gap-1 rounded-lg border border-border bg-elevated/50 py-1.5 text-[10px] text-subtle hover:text-white transition-all"
                  >
                    <Share2 className="h-3 w-3" /> Link
                  </button>
                  <button
                    onClick={() => setPendingDelete(r)}
                    aria-label="Delete render"
                    title="Delete render"
                    className="flex items-center justify-center gap-1 rounded-lg border border-ember-500/20 py-1.5 text-[10px] text-ember-400/80 hover:bg-ember-500/10 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <Link
                  href={`/projects/${r.project_id}/edit`}
                  className="mt-2 block text-center text-[10px] text-muted hover:text-gold-500 transition-colors"
                >
                  Open source project →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this render?"
        description={
          <>
            The cloud copy of <strong className="text-white">{pendingDelete?.project_title}</strong> will be permanently deleted. The source project stays intact and you can re-export anytime.
          </>
        }
        confirmLabel="Delete render"
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
