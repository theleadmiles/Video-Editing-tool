"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, X } from "lucide-react";
import type { TimelineClip } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  captions: TimelineClip[];
  onApply: (updated: TimelineClip[]) => void;
}

export function CaptionFindReplace({ open, onClose, captions, onApply }: Props) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);

  function preview() {
    if (!find.trim()) return [];
    const flags = caseSensitive ? "g" : "gi";
    const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    return captions
      .map((c, i) => {
        const text = String(c.text || "");
        if (!regex.test(text)) return null;
        return { index: i, original: text, replaced: text.replace(regex, replace) };
      })
      .filter(Boolean) as Array<{ index: number; original: string; replaced: string }>;
  }

  const matches = preview();

  function applyAll() {
    if (matches.length === 0) return;
    const flags = caseSensitive ? "g" : "gi";
    const regex = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
    const updated = captions.map((c) => ({
      ...c,
      text: String(c.text || "").replace(regex, replace),
    }));
    onApply(updated);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Find and replace captions" className="max-w-lg">
      <div className="p-6">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-muted hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/15">
            <Search className="h-4 w-4 text-gold-500" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Find & replace</h2>
            <p className="text-xs text-muted">Edit all captions at once</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-subtle mb-1 block">Find</label>
            <input
              type="text"
              value={find}
              onChange={(e) => setFind(e.target.value)}
              placeholder="Word or phrase"
              className="w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-white placeholder:text-muted focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-subtle mb-1 block">Replace with</label>
            <input
              type="text"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="New text"
              className="w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-white placeholder:text-muted focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-subtle cursor-pointer">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="accent-gold-500"
            />
            Match case
          </label>

          {/* Preview */}
          {find.trim() && (
            <div className="rounded-xl border border-border bg-elevated/50 p-3 max-h-40 overflow-y-auto">
              {matches.length === 0 ? (
                <p className="text-xs text-muted text-center py-2">No matches found</p>
              ) : (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
                    {matches.length} match{matches.length !== 1 ? "es" : ""}
                  </p>
                  <div className="space-y-2">
                    {matches.slice(0, 5).map((m) => (
                      <div key={m.index} className="text-[11px]">
                        <p className="text-muted line-through truncate">{m.original}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <ArrowRight className="h-3 w-3 text-gold-500 flex-shrink-0" />
                          <p className="text-white truncate">{m.replaced}</p>
                        </div>
                      </div>
                    ))}
                    {matches.length > 5 && (
                      <p className="text-[10px] text-muted">…and {matches.length - 5} more</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={applyAll} disabled={matches.length === 0}>
            Replace {matches.length > 0 && `(${matches.length})`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
