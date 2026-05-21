"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  LayoutDashboard,
  FolderOpen,
  LayoutTemplate,
  Palette,
  Settings,
  LogOut,
  Zap,
  Plus,
  Shield,
  Library,
  Mic2,
  Film,
  Captions,
  Clapperboard,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard",          icon: LayoutDashboard, label: "Dashboard" },
  { href: "/projects",           icon: FolderOpen,      label: "Projects" },
  { href: "/projects/caption",   icon: Captions,        label: "Caption Video" },
  { href: "/projects/reel",      icon: Clapperboard,    label: "Reel Creator" },
  { href: "/renders",            icon: Film,            label: "Renders" },
  { href: "/assets",             icon: Library,         label: "Assets" },
  { href: "/templates",          icon: LayoutTemplate,  label: "Templates" },
  { href: "/voice-lab",          icon: Mic2,            label: "Voice Lab" },
  { href: "/brand-kit",          icon: Palette,         label: "Brand Kit" },
  { href: "/settings",           icon: Settings,        label: "Settings" },
  { href: "/admin",              icon: Shield,          label: "Admin" },
];

interface AppSidebarProps {
  user: User;
  creditsRemaining?: number;
  creditsTotal?: number;
}

export function AppSidebar({ user, creditsRemaining = 0, creditsTotal = 3 }: AppSidebarProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createClient();

  // Persist collapsed state in localStorage
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);
  function toggle() {
    setCollapsed((v) => {
      localStorage.setItem("sidebar-collapsed", String(!v));
      return !v;
    });
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/");
    router.refresh();
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const initials    = displayName.slice(0, 2).toUpperCase();
  const creditPct   = creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0;

  return (
    <aside
      className={cn(
        "hidden lg:flex h-screen flex-col border-r border-border bg-surface transition-all duration-200 flex-shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo + collapse toggle */}
      <div className={cn(
        "flex h-14 items-center border-b border-border flex-shrink-0",
        collapsed ? "justify-center px-0" : "justify-between px-4"
      )}>
        {!collapsed && <Logo size="sm" />}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-white hover:bg-elevated transition-all"
        >
          {collapsed
            ? <PanelLeftOpen  className="h-4 w-4" />
            : <PanelLeftClose className="h-4 w-4" />
          }
        </button>
      </div>

      {/* Create button */}
      <div className={cn("p-2 flex-shrink-0", collapsed && "px-2")}>
        {collapsed ? (
          <Link
            href="/projects/new"
            className="flex h-9 w-9 mx-auto items-center justify-center rounded-xl bg-gold-500 text-white hover:bg-gold-600 transition-all shadow-glow-gold-sm"
            aria-label="New Video"
          >
            <Plus className="h-4 w-4" />
          </Link>
        ) : (
          <Button className="w-full gap-2" size="sm" asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4" />
              New Video
            </Link>
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon   = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-150",
                collapsed ? "justify-center gap-0" : "gap-3",
                active
                  ? "bg-gold-500/15 text-gold-500"
                  : "text-subtle hover:bg-elevated hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Credits bar */}
      {!collapsed ? (
        <div className="mx-2 mb-2 rounded-xl border border-border bg-elevated p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-subtle">
              <Zap className="h-3 w-3 text-gold-500" />
              AI Credits
            </div>
            <span className="text-xs font-semibold text-gold-500">{creditsRemaining} left</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-overlay">
            <div
              className="h-1.5 rounded-full bg-gradient-gold transition-all"
              style={{ width: `${creditPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-muted">
            Free plan · <Link href="/settings" className="text-gold-500 hover:underline">Upgrade</Link>
          </p>
        </div>
      ) : (
        <div className="flex justify-center py-2">
          <div
            title={`${creditsRemaining} AI credits left`}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-elevated text-[10px] font-bold text-gold-500"
          >
            {creditsRemaining}
          </div>
        </div>
      )}

      {/* User */}
      <div className="border-t border-border p-2">
        <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-xs font-bold text-gold-500 border border-gold-500/20">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white">{displayName}</p>
                <p className="truncate text-[10px] text-muted">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="flex-shrink-0 text-muted hover:text-ember-500 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
