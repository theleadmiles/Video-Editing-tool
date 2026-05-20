"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UploadedAsset {
  id: string;
  type: "video" | "audio" | "image";
  url: string;
  name: string;
}

interface AssetUploaderProps {
  kind: "video" | "audio" | "image";
  onUpload: (asset: UploadedAsset) => void;
  label?: string;
  hint?: string;
}

const ACCEPT_MAP = {
  video: "video/mp4,video/quicktime,video/webm,video/x-matroska",
  audio: "audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg",
  image: "image/jpeg,image/png,image/webp,image/gif",
};

export function AssetUploader({ kind, onUpload, label, hint }: AssetUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function uploadFile(file: File) {
    setUploading(true);
    setProgress(0);

    try {
      // Animate progress while uploading (real progress requires XHR)
      const fakeProgress = setInterval(() => {
        setProgress((p) => Math.min(p + Math.random() * 8, 90));
      }, 200);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);

      const res = await fetch("/api/upload-asset", {
        method: "POST",
        body: formData,
      });

      clearInterval(fakeProgress);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setProgress(100);
      onUpload(data.asset);
      toast.success(`${file.name} uploaded!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div
      onClick={() => !uploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer",
        dragging
          ? "border-gold-500 bg-gold-500/10"
          : "border-border bg-elevated/30 hover:border-gold-500/40 hover:bg-elevated/60",
        uploading && "pointer-events-none"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_MAP[kind]}
        onChange={handleFileChange}
        className="hidden"
        aria-label={`Upload ${kind} file`}
      />

      {uploading ? (
        <>
          <Loader2 className="h-5 w-5 text-gold-500 animate-spin mb-2" />
          <p className="text-xs text-subtle font-medium">Uploading… {Math.round(progress)}%</p>
          <div className="mt-2 h-1 w-full rounded-full bg-overlay overflow-hidden">
            <div
              className="h-1 rounded-full bg-gradient-gold transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <div className={cn(
            "mb-2 flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
            dragging ? "bg-gold-500 text-black" : "bg-elevated text-subtle"
          )}>
            <Upload className="h-4 w-4" />
          </div>
          <p className="text-xs font-semibold text-white">
            {label || `Drop ${kind} or click to upload`}
          </p>
          {hint && <p className="mt-0.5 text-[10px] text-muted">{hint}</p>}
        </>
      )}
    </div>
  );
}

interface AssetCardProps {
  asset: { id: string; type: "video" | "audio" | "image"; url: string; name?: string };
  selected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  draggable?: boolean;
}

export function AssetCard({ asset, selected, onClick, onDelete, draggable = true }: AssetCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border overflow-hidden transition-all cursor-pointer",
        selected ? "border-gold-500/60 ring-2 ring-gold-500/20" : "border-border hover:border-border-strong"
      )}
      onClick={onClick}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData(
          "application/x-boltcut-asset",
          JSON.stringify({ id: asset.id, type: asset.type, url: asset.url, name: asset.name })
        );
      }}
    >
      {asset.type === "video" ? (
        <video
          src={asset.url}
          className="aspect-video w-full object-cover bg-elevated"
          muted
          playsInline
          onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
          onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
        />
      ) : asset.type === "audio" ? (
        <div className="aspect-video w-full bg-gradient-to-br from-ember-500/10 to-gold-500/10 flex items-center justify-center">
          <span className="text-2xl">🎵</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset.url} alt={asset.name || ""} className="aspect-video w-full object-cover bg-elevated" />
      )}
      {asset.name && (
        <p className="px-2 py-1.5 text-[10px] text-subtle truncate bg-surface">{asset.name}</p>
      )}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete asset"
          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-ember-500/80"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}
