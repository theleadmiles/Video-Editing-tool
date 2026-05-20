"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDuration, formatRelativeTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Film, Sparkles, Trash2, Copy, MoreHorizontal, Search, SlidersHorizontal, RefreshCw } from "lucide-react";

interface Project {
  id: string;
  title: string;
  status: string;
  duration_seconds: number | null;
  aspect_ratio: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

const statusVariant: Record<string, "default" | "secondary" | "success"> = {
  draft: "secondary",
  ready: "default",
  exported: "success",
  generating: "secondary",
};

const STATUS_FILTERS = ["all", "draft", "generating", "ready", "exported"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export default function ProjectsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Confirm-delete modal state
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);

  // Refs for stable polling without re-creating the interval
  const projectsRef = useRef<Project[]>([]);
  projectsRef.current = projects;

  async function loadProjects() {
    const { data } = await supabase
      .from("projects")
      .select("id, title, status, duration_seconds, aspect_ratio, thumbnail_url, created_at, updated_at")
      .order("updated_at", { ascending: false });
    setProjects(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadProjects();
  }, []);

  // Poll every 5s if any project is generating — stable interval, no dep churn
  useEffect(() => {
    const interval = setInterval(async () => {
      const hasGenerating = projectsRef.current.some((p) => p.status === "generating");
      if (!hasGenerating) return;

      const previousStatuses = new Map(projectsRef.current.map((p) => [p.id, p.status]));

      const { data } = await supabase
        .from("projects")
        .select("id, title, status, duration_seconds, aspect_ratio, thumbnail_url, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (!data) return;

      // Detect transitions from "generating" → "ready"
      const justReady = data.some(
        (p) => previousStatuses.get(p.id) === "generating" && p.status === "ready"
      );
      if (justReady) toast.success("Your video is ready! 🎉");

      setProjects(data);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  async function deleteProject(project: Project) {
    setDeleting(project.id);
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      toast.success("Project deleted");
    } catch { toast.error("Failed to delete project"); }
    finally { setDeleting(null); setMenuOpen(null); setPendingDelete(null); }
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch = !search.trim() || p.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  async function duplicateProject(id: string) {
    setDuplicating(id);
    try {
      const res = await fetch(`/api/projects/${id}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error();
      toast.success("Project duplicated!");
      router.push(`/projects/${data.projectId}/edit`);
    } catch { toast.error("Failed to duplicate project"); setDuplicating(null); }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-xl skeleton" />
            <div className="h-4 w-32 rounded-lg skeleton" />
          </div>
          <div className="h-10 w-28 rounded-xl skeleton" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface overflow-hidden">
              <div className="h-36 skeleton" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 rounded skeleton" />
                <div className="h-3 w-1/2 rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">All Projects</h1>
          <p className="mt-1 text-sm text-subtle">
            {projects.length
              ? `${filteredProjects.length} of ${projects.length} video${projects.length !== 1 ? "s" : ""}`
              : "No videos yet"}
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" />
            New Video
          </Link>
        </Button>
      </div>

      {/* Search + filter bar */}
      {projects.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search projects"
              className="w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-muted focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted flex-shrink-0" aria-hidden="true" />
            <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Filter by status">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  aria-pressed={statusFilter === s}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500",
                    statusFilter === s
                      ? "bg-gold-500/15 text-gold-500 border border-gold-500/30"
                      : "border border-border text-subtle hover:text-white hover:border-border-strong"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!projects.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-24 text-center">
          <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gold-500/10">
            <Sparkles className="h-9 w-9 text-gold-500" />
            <div className="absolute inset-0 rounded-3xl bg-gold-500/5 animate-glow-pulse" />
          </div>
          <h3 className="font-display text-lg font-semibold text-white">Your first video awaits</h3>
          <p className="mt-1.5 max-w-xs text-sm text-subtle leading-relaxed">
            Type a topic, pick a voice, and Boltcut builds the video for you in under 60 seconds.
          </p>
          <Button className="mt-6" asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4" /> Create first video
            </Link>
          </Button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-16 text-center">
          <Search className="mb-3 h-10 w-10 text-muted" aria-hidden="true" />
          <h3 className="font-semibold text-white">No projects match</h3>
          <p className="mt-1 text-sm text-subtle">Try a different search or filter.</p>
          <button
            onClick={() => { setSearch(""); setStatusFilter("all"); }}
            className="mt-3 text-xs text-gold-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group relative rounded-2xl border border-border bg-surface overflow-hidden hover:border-gold-500/30 transition-all hover:-translate-y-0.5 shadow-card hover:shadow-card-hover"
            >
              {/* Thumbnail */}
              <div className="relative h-36 bg-gradient-to-br from-gold-500/10 to-ember-500/10 flex items-center justify-center overflow-hidden">
                {project.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.thumbnail_url}
                    alt={`${project.title || "Untitled project"} thumbnail`}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : project.status === "generating" ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
                    <span className="text-[10px] text-gold-400 font-medium">Generating…</span>
                  </div>
                ) : (
                  <Film className="h-8 w-8 text-white/20" aria-hidden="true" />
                )}
                {project.thumbnail_url && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
                )}
                <div className="absolute top-2 left-2">
                  {project.status === "generating" ? (
                    <Badge variant="secondary" className="text-[10px] gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-gold-500 animate-pulse" />
                      Generating
                    </Badge>
                  ) : (
                    <Badge variant={statusVariant[project.status] || "secondary"} className="text-[10px] capitalize">
                      {project.status}
                    </Badge>
                  )}
                </div>
                <div className="absolute bottom-2 right-2 text-[10px] text-white/70 font-medium bg-black/40 rounded px-1.5 py-0.5">
                  {project.aspect_ratio}
                </div>

                {/* Action menu button */}
                <button
                  onClick={(e) => { e.preventDefault(); setMenuOpen(menuOpen === project.id ? null : project.id); }}
                  aria-label={`More actions for ${project.title || "Untitled"}`}
                  className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-black/40 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity border border-white/10 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
                >
                  <MoreHorizontal className="h-3.5 w-3.5 text-white" />
                </button>

                {/* Dropdown menu */}
                {menuOpen === project.id && (
                  <div className="absolute top-10 right-2 z-20 rounded-xl border border-border bg-surface shadow-xl p-1 min-w-[140px]" role="menu">
                    <button
                      onClick={() => duplicateProject(project.id)}
                      disabled={duplicating === project.id}
                      role="menuitem"
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-subtle hover:bg-elevated hover:text-white transition-all focus-visible:outline-none focus-visible:bg-elevated"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {duplicating === project.id ? "Duplicating..." : "Duplicate"}
                    </button>
                    <button
                      onClick={() => { setMenuOpen(null); setPendingDelete(project); }}
                      role="menuitem"
                      className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-ember-500 hover:bg-ember-500/10 transition-all focus-visible:outline-none focus-visible:bg-ember-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-white text-sm line-clamp-2 leading-snug">
                  {project.title || "Untitled"}
                </h3>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                  {project.duration_seconds && <span>{formatDuration(project.duration_seconds)}</span>}
                  {project.duration_seconds && <span>·</span>}
                  <span>{formatRelativeTime(project.updated_at)}</span>
                </div>
                {/* Failed draft — show retry hint */}
                {project.status === "draft" && !project.duration_seconds && (
                  <p className="mt-2 text-[10px] text-ember-500/80 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Generation failed — create a new video to retry
                  </p>
                )}
                <Button size="sm" className="w-full mt-3" asChild>
                  <Link href={`/projects/${project.id}/edit`}>Open editor</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
      )}

      {/* Delete confirmation modal */}
      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => { if (pendingDelete) deleteProject(pendingDelete); }}
        title="Delete this project?"
        description={
          <>
            <strong className="text-white">&ldquo;{pendingDelete?.title || "Untitled"}&rdquo;</strong> will be permanently deleted, including its script, voiceover, and timeline. This cannot be undone.
          </>
        }
        confirmLabel="Delete project"
        variant="destructive"
        loading={deleting === pendingDelete?.id}
      />
    </div>
  );
}
