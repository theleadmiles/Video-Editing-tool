"use client";

import { Dialog } from "@/components/ui/dialog";
import { X, Keyboard } from "lucide-react";

const SHORTCUTS = [
  { group: "Playback", items: [
    { keys: ["Space"], label: "Play / Pause" },
    { keys: ["J"], label: "Rewind 5s" },
    { keys: ["K"], label: "Pause" },
    { keys: ["L"], label: "Play / Forward 5s" },
    { keys: ["←", "→"], label: "Seek ±5s" },
    { keys: ["Shift", "←/→"], label: "Seek ±1s (frame)" },
    { keys: ["M"], label: "Mute / Unmute" },
  ]},
  { group: "Editing", items: [
    { keys: ["⌘", "K"], label: "Split clip at playhead" },
    { keys: ["⌘", "D"], label: "Duplicate clip" },
    { keys: ["⌘", "Z"], label: "Undo" },
    { keys: ["⌘", "⇧", "Z"], label: "Redo" },
    { keys: ["Del"], label: "Delete selected clip(s)" },
    { keys: ["Click"], label: "Select clip" },
    { keys: ["⇧", "Click"], label: "Add to selection" },
    { keys: ["⌘", "Click"], label: "Toggle in selection" },
    { keys: ["Right-click"], label: "Open context menu" },
    { keys: ["Drag"], label: "Reorder clips · Drop assets" },
  ]},
  { group: "In/Out & Loop", items: [
    { keys: ["I"], label: "Set In point at playhead" },
    { keys: ["O"], label: "Set Out point at playhead" },
    { keys: ["⇧", "I"], label: "Clear In point" },
    { keys: ["⇧", "O"], label: "Clear Out point" },
  ]},
  { group: "Help", items: [
    { keys: ["?"], label: "Show this cheatsheet" },
    { keys: ["Esc"], label: "Close modal / Deselect" },
  ]},
];

export function KeyboardCheatsheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Keyboard shortcuts" className="max-w-lg">
      <div className="p-6">
        <button
          onClick={onClose}
          aria-label="Close cheatsheet"
          className="absolute right-4 top-4 text-muted hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/15">
            <Keyboard className="h-4 w-4 text-gold-500" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">Keyboard shortcuts</h2>
            <p className="text-xs text-muted">Edit faster — like a pro</p>
          </div>
        </div>

        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {SHORTCUTS.map((group) => (
            <div key={group.group}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {group.group}
              </p>
              <div className="space-y-1.5">
                {group.items.map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-sm py-1">
                    <span className="text-subtle">{s.label}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <span key={i}>
                          <kbd className="rounded border border-border bg-elevated px-1.5 py-0.5 text-[10px] font-mono text-white font-semibold">
                            {k}
                          </kbd>
                          {i < s.keys.length - 1 && <span className="mx-0.5 text-muted">+</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 pt-4 border-t border-border text-[10px] text-muted text-center">
          Press <kbd className="rounded border border-border bg-elevated px-1 py-0.5 font-mono">?</kbd> any time to see this
        </p>
      </div>
    </Dialog>
  );
}
