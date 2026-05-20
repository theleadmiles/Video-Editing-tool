"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AssetUploader } from "@/components/editor/asset-uploader";
import { formatRelativeTime, cn } from "@/lib/utils";
import { toast } from "sonner";
import { Film, Music2, Image as ImageIcon, Trash2, FolderOpen, Search } from "lucide-react";

interface UploadedAsset {
  id: string;
  type: "video" | "audio" | "image";
  source: string;
  url: string;
  duration_seconds: number | null;
  metadata: { original_name?: string; size_bytes?: number } | null;
  created_at: string;
}

const FILTERS = ["All", "Videos", "Audio", "Images"] as const;
type Filter = (typeof FILTERS)[number];

const TYPE_MAP: Record<Filter, string | null> = {
  All: null,
  Videos: "video",
  Audio: "audio",
  Images: "image",
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("All");
  const [search, setSearch] = useState("");
  const [pendingDelete, setPendingDelete] = useState<UploadedAsset | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadAssets() {
    setLoading(true);
    try {
      const res = await fetch("/api/assets");
      const data = await res.json();
      setAssets(data.assets || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { loadAssets(); }, []);

  const filtered = useMemo(() => {
    const typeFilter = TYPE_MAP[filter];
    return assets.filter((a) => {
      const matchesType = !typeFilter || a.type === typeFilter;
      const matchesSearch = !search.trim()
        || (a.metadata?.original_name || "").toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [assets, filter, search]);

  function countOf(f: Filter) {
    const typeFilter = TYPE_MAP[f];
    return !typeFilter ? assets.length : assets.filter((a) => a.type === typeFilter).length;
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/assets?id=${pendingDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAssets((prev) => prev.filter((a) => a.id !== pendingDelete.id));
      toast.success("Asset deleted");
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  function bytesToHuman(bytes?: number) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Asset Library</h1>
          <p className="mt-1 text-sm text-subtle">
            {assets.length
              ? `${filtered.length} of ${assets.length} file${assets.length !== 1 ? "s" : ""}`
              : "Your uploaded videos, audio, and images live here"}
          </p>
        </div>
      </div>

      {/* Upload zone */}
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <AssetUploader
          kind="video"
          onUpload={() => loadAssets()}
          label="Drop video here"
          hint="MP4, MOV, WebM · up to 100MB"
        />
        <AssetUploader
          kind="audio"
          onUpload={() => loadAssets()}
          label="Drop audio here"
          hint="MP3, WAV, M4A · up to 25MB"
        />
        <AssetUploader
          kind="image"
          onUpload={() => loadAssets()}
          label="Drop image here"
          hint="JPG, PNG, WebP · up to 10MB"
        />
      </div>

      {/* Search + filter */}
      {assets.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name..."
              aria-label="Search assets"
              className="w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-muted focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
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

      {/* Grid */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface aspect-video skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-20 text-center">
          <FolderOpen className="mb-3 h-12 w-12 text-muted" aria-hidden="true" />
          <h3 className="font-display text-lg font-semibold text-white">
            {assets.length === 0 ? "No assets yet" : "No matches"}
          </h3>
          <p className="mt-1.5 max-w-xs text-sm text-subtle leading-relaxed">
            {assets.length === 0
              ? "Upload your footage, music, or images and they'll appear in every project."
              : "Try a different search or filter."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="group relative rounded-xl border border-border bg-surface overflow-hidden hover:border-gold-500/30 transition-all"
            >
              {a.type === "video" ? (
                <video
                  src={a.url}
                  className="aspect-video w-full object-cover bg-elevated"
                  muted
                  playsInline
                  onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                  onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                />
              ) : a.type === "audio" ? (
                <div className="aspect-video w-full bg-gradient-to-br from-ember-500/10 to-gold-500/10 flex items-center justify-center">
                  <Music2 className="h-10 w-10 text-ember-500/60" />
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.url}
                  alt={a.metadata?.original_name || ""}
                  loading="lazy"
                  className="aspect-video w-full object-cover bg-elevated"
                />
              )}

              {/* Type badge */}
              <div className="absolute top-1.5 left-1.5">
                <Badge variant="secondary" className="text-[9px] gap-1">
                  {a.type === "video" && <Film className="h-2.5 w-2.5" />}
                  {a.type === "audio" && <Music2 className="h-2.5 w-2.5" />}
                  {a.type === "image" && <ImageIcon className="h-2.5 w-2.5" />}
                  {a.type}
                </Badge>
              </div>

              {/* Delete */}
              <button
                onClick={() => setPendingDelete(a)}
                aria-label="Delete asset"
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-ember-500/80"
              >
                <Trash2 className="h-3 w-3" />
              </button>

              {/* Info */}
              <div className="p-2">
                <p className="text-[11px] text-white truncate font-medium">
                  {a.metadata?.original_name || "Untitled"}
                </p>
                <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted">
                  <span>{bytesToHuman(a.metadata?.size_bytes)}</span>
                  <span>{formatRelativeTime(a.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this asset?"
        description={
          <>
            <strong className="text-white">{pendingDelete?.metadata?.original_name || "This file"}</strong>{" "}
            will be permanently removed. Any project still using it will lose access.
          </>
        }
        confirmLabel="Delete"
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}
