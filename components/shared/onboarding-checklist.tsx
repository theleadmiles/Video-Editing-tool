"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, ChevronDown, X, Sparkles } from "lucide-react";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href?: string;
  cta: string;
}

const CHECKLIST: ChecklistItem[] = [
  {
    id: "first_video",
    label: "Create your first video",
    description: "Generate an AI video from a topic or script.",
    href: "/projects/new",
    cta: "Create video →",
  },
  {
    id: "explore_templates",
    label: "Explore templates",
    description: "Start faster with pre-built video formats.",
    href: "/templates",
    cta: "Browse templates →",
  },
  {
    id: "setup_brand_kit",
    label: "Set up your brand kit",
    description: "Add your colors and fonts for consistent videos.",
    href: "/brand-kit",
    cta: "Open brand kit →",
  },
  {
    id: "try_ai_edit",
    label: "Try the AI editor",
    description: 'Open any video and use the "AI Edit" tab to refine.',
    href: "/projects",
    cta: "Open a project →",
  },
];

const STORAGE_KEY = "boltcut_onboarding";

interface OnboardingChecklistProps {
  completedItems?: string[];
}

export function OnboardingChecklist({ completedItems = [] }: OnboardingChecklistProps) {
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedItems));
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { completed: c, dismissed: d } = JSON.parse(stored);
        if (c) setCompleted(new Set([...completedItems, ...c]));
        if (d) setDismissed(true);
      }
    } catch {}
  }, []);

  function persist(newCompleted: Set<string>, newDismissed: boolean) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completed: Array.from(newCompleted), dismissed: newDismissed })
    );
  }

  function markDone(id: string) {
    const next = new Set(completed);
    next.add(id);
    setCompleted(next);
    persist(next, dismissed);
  }

  function dismiss() {
    setDismissed(true);
    persist(completed, true);
  }

  const allDone = CHECKLIST.every((item) => completed.has(item.id));

  if (dismissed || allDone) return null;

  const doneCount = CHECKLIST.filter((item) => completed.has(item.id)).length;

  return (
    <div className="mb-8 rounded-2xl border border-gold-500/20 bg-gold-500/5 overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-500/15">
            <Sparkles className="h-4 w-4 text-gold-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Getting started</p>
            <p className="text-xs text-subtle">{doneCount} of {CHECKLIST.length} completed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-full bg-overlay">
              <div
                className="h-1.5 rounded-full bg-gradient-gold transition-all"
                style={{ width: `${(doneCount / CHECKLIST.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gold-500 font-semibold">{Math.round((doneCount / CHECKLIST.length) * 100)}%</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            className="rounded-lg p-1 text-muted hover:text-white transition-colors"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <ChevronDown className={cn("h-4 w-4 text-subtle transition-transform", collapsed && "rotate-180")} />
        </div>
      </div>

      {!collapsed && (
        <div className="border-t border-gold-500/10 px-4 pb-4 pt-3 grid gap-2 sm:grid-cols-2">
          {CHECKLIST.map((item) => {
            const done = completed.has(item.id);
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 transition-all",
                  done
                    ? "border-green-500/20 bg-green-500/5"
                    : "border-border bg-surface hover:border-gold-500/20"
                )}
              >
                <button onClick={() => markDone(item.id)} className="flex-shrink-0 mt-0.5">
                  {done
                    ? <CheckCircle2 className="h-4 w-4 text-green-400" />
                    : <Circle className="h-4 w-4 text-muted hover:text-gold-500 transition-colors" />
                  }
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm font-medium", done ? "text-muted line-through" : "text-white")}>
                    {item.label}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{item.description}</p>
                  {!done && item.href && (
                    <Link
                      href={item.href}
                      onClick={() => markDone(item.id)}
                      className="mt-1.5 inline-block text-xs text-gold-500 hover:underline font-medium"
                    >
                      {item.cta}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
