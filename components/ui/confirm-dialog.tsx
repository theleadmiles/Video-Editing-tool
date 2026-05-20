"use client";

import { Dialog } from "./dialog";
import { Button } from "./button";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  loading?: boolean;
  /** Cost note shown above confirm — e.g. "Uses 1 credit" */
  costNote?: string;
}

/**
 * Reusable confirmation modal. Replaces window.confirm everywhere.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  costNote,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? () => {} : onClose} ariaLabel={title} closeOnEsc={!loading} closeOnBackdrop={!loading}>
      <div className="p-6">
        {/* Close */}
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Close dialog"
          className="absolute right-4 top-4 text-muted hover:text-white transition-colors disabled:opacity-30"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        {variant === "destructive" && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-500/15">
            <AlertTriangle className="h-6 w-6 text-ember-500" />
          </div>
        )}

        {/* Title + description */}
        <h2 className="font-display text-lg font-bold text-white pr-8">{title}</h2>
        {description && (
          <div className="mt-2 text-sm text-subtle leading-relaxed">{description}</div>
        )}

        {/* Cost note */}
        {costNote && (
          <div className="mt-4 rounded-xl border border-gold-500/20 bg-gold-500/5 p-2.5">
            <p className="text-xs text-gold-400 flex items-center gap-1.5">
              <span>⚡</span> {costNote}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
