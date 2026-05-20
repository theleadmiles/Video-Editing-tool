"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
  /** Set false to disable Esc-to-close (e.g. during destructive in-flight ops) */
  closeOnEsc?: boolean;
  /** Set false to disable click-backdrop-to-close */
  closeOnBackdrop?: boolean;
}

/**
 * Accessible modal primitive: focus trap, Esc-to-close, click-backdrop,
 * role="dialog" + aria-modal. Locks body scroll while open.
 */
export function Dialog({
  open,
  onClose,
  children,
  ariaLabel,
  className,
  closeOnEsc = true,
  closeOnBackdrop = true,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Lock body scroll + store the trigger that opened the modal
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus();
    };
  }, [open]);

  // Keyboard handling
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && closeOnEsc) {
        e.preventDefault();
        onClose();
        return;
      }
      // Focus trap on Tab
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, closeOnEsc]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          "w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl",
          "animate-in fade-in zoom-in-95 duration-200",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
