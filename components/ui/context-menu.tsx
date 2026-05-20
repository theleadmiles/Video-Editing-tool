"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface ContextMenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  shortcut?: string;
  divider?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

/**
 * Floating context menu. Auto-positions to stay in viewport. Closes on
 * click outside, Esc, or item click.
 */
export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Keep menu in viewport
  const adjustedX = typeof window !== "undefined" ? Math.min(x, window.innerWidth - 200) : x;
  const adjustedY = typeof window !== "undefined" ? Math.min(y, window.innerHeight - items.length * 36) : y;

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-[100] min-w-[180px] rounded-xl border border-border bg-surface shadow-2xl p-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: adjustedX, top: adjustedY }}
    >
      {items.map((item, i) => {
        if (item.divider) {
          return <div key={i} className="my-1 h-px bg-border" role="separator" />;
        }
        const Icon = item.icon;
        return (
          <button
            key={i}
            disabled={item.disabled}
            role="menuitem"
            onClick={() => { item.onClick(); onClose(); }}
            className={cn(
              "w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-left transition-all focus-visible:outline-none focus-visible:bg-elevated",
              item.disabled
                ? "text-muted/40 cursor-not-allowed"
                : item.destructive
                  ? "text-ember-400 hover:bg-ember-500/10"
                  : "text-subtle hover:bg-elevated hover:text-white"
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <kbd className="text-[9px] font-mono text-muted/70">{item.shortcut}</kbd>
            )}
          </button>
        );
      })}
    </div>
  );
}
