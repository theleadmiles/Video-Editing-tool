"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  LayoutDashboard, FolderOpen, LayoutTemplate,
  Palette, Settings, LogOut, Zap, Plus,
  Menu, X, Shield, Library, Mic2, Film,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects", icon: FolderOpen, label: "Projects" },
  { href: "/renders", icon: Film, label: "Renders" },
  { href: "/assets", icon: Library, label: "Assets" },
  { href: "/templates", icon: LayoutTemplate, label: "Templates" },
  { href: "/voice-lab", icon: Mic2, label: "Voice Lab" },
  { href: "/brand-kit", icon: Palette, label: "Brand Kit" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/admin", icon: Shield, label: "Admin" },
];

interface MobileNavProps {
  user: User;
  creditsRemaining?: number;
  creditsTotal?: number;
}

export function MobileNav({ user, creditsRemaining = 0, creditsTotal = 3 }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/");
    router.refresh();
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Top bar for mobile */}
      <div className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
        <Logo size="sm" />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-subtle hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <Logo size="sm" />
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-subtle hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Create button */}
        <div className="p-3">
          <Link
            href="/projects/new"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-ember-500 px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New Video
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-gold-500/15 text-gold-500"
                    : "text-subtle hover:bg-elevated hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Credits */}
        <div className="mx-3 mb-3 rounded-xl border border-border bg-elevated p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-subtle">
              <Zap className="h-3 w-3 text-gold-500" />
              AI Credits
            </div>
            <span className="text-xs font-semibold text-gold-500">{creditsRemaining} left</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-overlay">
            <div
              className="h-1.5 rounded-full bg-gradient-gold"
              style={{ width: `${creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* User */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-xs font-bold text-gold-500">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="flex-shrink-0 text-muted hover:text-ember-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 rounded"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
