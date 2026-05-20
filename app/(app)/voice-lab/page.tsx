"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { cn, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import {
  Mic2, Play, Square, Trash2, Plus, Upload, Loader2,
  Sparkles, X, Info, CheckCircle2,
} from "lucide-react";

interface ClonedVoice {
  asset_id: string;
  voice_id: string;
  name: string;
  description: string | null;
  accent: string | null;
  sample_url: string;
  created_at: string;
}

const ACCENTS = ["Indian English", "American", "British", "Australian", "Custom"];

export default function VoiceLabPage() {
  const [voices, setVoices] = useState<ClonedVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ClonedVoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/voice-clone");
      const data = await res.json();
      setVoices(data.voices || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  function togglePreview(voice: ClonedVoice) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingId === voice.asset_id) {
      setPlayingId(null);
      return;
    }
    if (!voice.sample_url) {
      toast.error("No sample to preview");
      return;
    }
    setPlayingId(voice.asset_id);
    const audio = new Audio(voice.sample_url);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => { setPlayingId(null); toast.error("Couldn't play preview"); };
    audio.play().catch(() => { setPlayingId(null); });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/voice-clone?asset_id=${pendingDelete.asset_id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setVoices((prev) => prev.filter((v) => v.asset_id !== pendingDelete.asset_id));
      toast.success("Voice deleted");
    } catch {
      toast.error("Couldn't delete voice");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-gold-500" />
            Voice Lab
          </h1>
          <p className="mt-1 text-sm text-subtle">
            Clone your own voice — or anyone&apos;s — for use in any project
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          Clone a voice
        </Button>
      </div>

      {/* Info banner */}
      <div className="mb-6 rounded-xl border border-gold-500/20 bg-gold-500/5 p-3 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-gold-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-subtle leading-relaxed">
          Voice cloning needs an <span className="text-white font-medium">ElevenLabs Creator plan</span> or higher.
          Upload 30 seconds to 2 minutes of clean audio. Speak naturally — no music or background noise.
          The cloned voice will be available in every project&apos;s voice picker.
        </div>
      </div>

      {/* Voice grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface h-32 skeleton" />
          ))}
        </div>
      ) : voices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500/10">
            <Mic2 className="h-7 w-7 text-gold-500" />
          </div>
          <h3 className="font-display text-lg font-semibold text-white">No cloned voices yet</h3>
          <p className="mt-1.5 max-w-sm text-sm text-subtle leading-relaxed">
            Upload a short clear sample and we&apos;ll create a Hindi-friendly voice clone in seconds.
          </p>
          <Button className="mt-5" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" /> Clone your first voice
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {voices.map((v) => (
            <div
              key={v.asset_id}
              className="group rounded-2xl border border-border bg-surface p-4 hover:border-gold-500/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gold-500/15 text-gold-500 font-bold">
                    {v.name[0]?.toUpperCase() || "V"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{v.name}</h3>
                    {v.accent && (
                      <p className="text-[10px] text-muted truncate">{v.accent}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setPendingDelete(v)}
                  aria-label={`Delete ${v.name}`}
                  className="opacity-0 group-hover:opacity-100 text-muted hover:text-ember-400 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {v.description && (
                <p className="text-xs text-subtle line-clamp-2 mb-3">{v.description}</p>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => togglePreview(v)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all",
                    playingId === v.asset_id
                      ? "border-gold-500/50 bg-gold-500/10 text-gold-500"
                      : "border-border text-subtle hover:text-white"
                  )}
                >
                  {playingId === v.asset_id ? (
                    <><Square className="h-3 w-3 fill-current" /> Stop</>
                  ) : (
                    <><Play className="h-3 w-3 fill-current" /> Preview</>
                  )}
                </button>
                <Badge variant="secondary" className="text-[9px]">
                  {formatRelativeTime(v.created_at)}
                </Badge>
              </div>

              <p className="mt-2 text-[9px] font-mono text-muted truncate" title={v.voice_id}>
                ID: {v.voice_id}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <CreateVoiceModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => { setShowCreate(false); load(); }}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this voice?"
        description={
          <>
            <strong className="text-white">{pendingDelete?.name}</strong> will be removed from
            ElevenLabs and from your library. Existing projects using it may break.
          </>
        }
        confirmLabel="Delete voice"
        variant="destructive"
        loading={deleting}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function CreateVoiceModal({
  open, onClose, onSuccess,
}: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState(ACCENTS[0]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setName(""); setDescription(""); setAccent(ACCENTS[0]);
    setFiles([]); setUploading(false); setProgress(0);
  }

  function handleClose() {
    if (uploading) return;
    reset();
    onClose();
  }

  function addFiles(newFiles: FileList | File[]) {
    const arr = Array.from(newFiles).filter((f) => f.type.startsWith("audio/"));
    if (arr.length === 0) {
      toast.error("Please upload audio files");
      return;
    }
    setFiles((prev) => [...prev, ...arr].slice(0, 10));
  }

  async function submit() {
    if (!name.trim()) { toast.error("Name required"); return; }
    if (files.length === 0) { toast.error("Upload at least one sample"); return; }

    setUploading(true);
    setProgress(0);
    const progTimer = setInterval(() => setProgress((p) => Math.min(p + Math.random() * 6, 90)), 250);

    try {
      const form = new FormData();
      form.append("name", name.trim());
      if (description.trim()) form.append("description", description.trim());
      if (accent && accent !== ACCENTS[0]) form.append("accent", accent);
      for (const f of files) form.append("files", f);

      const res = await fetch("/api/voice-clone", { method: "POST", body: form });
      const data = await res.json();
      clearInterval(progTimer);
      if (!res.ok) {
        const msg = data.detail || data.error || "Cloning failed";
        toast.error(typeof msg === "string" ? msg : "Cloning failed");
        setUploading(false);
        setProgress(0);
        return;
      }
      setProgress(100);
      toast.success(`Voice "${data.name}" ready!`);
      reset();
      onSuccess();
    } catch (err) {
      clearInterval(progTimer);
      toast.error(err instanceof Error ? err.message : "Cloning failed");
      setUploading(false);
      setProgress(0);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      ariaLabel="Clone a voice"
      closeOnEsc={!uploading}
      closeOnBackdrop={!uploading}
      className="max-w-lg"
    >
      <div className="p-6">
        <button
          onClick={handleClose}
          disabled={uploading}
          aria-label="Close"
          className="absolute right-4 top-4 text-muted hover:text-white transition-colors disabled:opacity-30"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/15">
            <Mic2 className="h-5 w-5 text-gold-500" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Clone a voice</h2>
            <p className="text-xs text-muted">30 seconds to 2 minutes of clean audio</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-subtle mb-1 block">Voice name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "My Hindi Voice"'
              maxLength={60}
              className="w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-white placeholder:text-muted focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
            />
          </div>

          <div>
            <label className="text-xs text-subtle mb-1 block">Accent</label>
            <select
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
            >
              {ACCENTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-subtle mb-1 block">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Warm, confident, energetic..."
              rows={2}
              maxLength={400}
              className="w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-white placeholder:text-muted focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 resize-none"
            />
          </div>

          {/* File drop zone */}
          <div>
            <label className="text-xs text-subtle mb-1 block">Audio samples *</label>
            <div
              onClick={() => !uploading && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "rounded-xl border-2 border-dashed p-4 text-center transition-all cursor-pointer",
                dragging
                  ? "border-gold-500 bg-gold-500/10"
                  : "border-border bg-elevated/30 hover:border-gold-500/40",
                uploading && "pointer-events-none opacity-60"
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={(e) => e.target.files && addFiles(e.target.files)}
                className="hidden"
              />
              <Upload className="mx-auto h-6 w-6 text-muted mb-1.5" />
              <p className="text-xs text-white font-medium">Drop audio files or click</p>
              <p className="text-[10px] text-muted mt-0.5">MP3, WAV, M4A — up to 25MB each, max 10 files</p>
            </div>

            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-elevated/50 px-2 py-1.5">
                    <span className="text-[11px] text-white truncate flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-400 flex-shrink-0" />
                      {f.name}
                    </span>
                    <span className="text-[10px] text-muted">
                      {(f.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploading && (
            <div>
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="text-subtle flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Cloning voice…
                </span>
                <span className="text-gold-500 font-mono">{Math.round(progress)}%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-overlay overflow-hidden">
                <div
                  className="h-1 rounded-full bg-gradient-gold transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="ghost" onClick={handleClose} disabled={uploading}>Cancel</Button>
          <Button onClick={submit} loading={uploading}>
            <Sparkles className="h-4 w-4" /> Clone voice
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
