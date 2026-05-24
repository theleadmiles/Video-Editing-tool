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
  LayoutDashboard, FolderOpen, LayoutTemplate,
  Palette, Settings, LogOut, Zap, Plus, Shield,
  Library, Mic2, Film, Captions, Clapperboard,
  PanelLeftClose, PanelLeftOpen, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Nav grouped into sections
const NAV_SECTIONS = [
  {
    id: "create",
    label: "Create",
    items: [
      { href: "/projects/caption", icon: Captions,     label: "Caption Video" },
      { href: "/projects/reel",    icon: Clapperboard, label: "Reel Creator"  },
    ],
  },
  {
    id: "manage",
    label: "Manage",
    items: [
      { href: "/dashboard",  icon: LayoutDashboard, label: "Dashboard"  },
      { href: "/projects",   icon: FolderOpen,      label: "Projects"   },
      { href: "/renders",    icon: Film,            label: "Renders"    },
      { href: "/assets",     icon: Library,         label: "Assets"     },
      { href: "/templates",  icon: LayoutTemplate,  label: "Templates"  },
    ],
  },
  {
    id: "lab",
    label: "Lab",
    items: [
      { href: "/voice-lab", icon: Mic2,    label: "Voice Lab"  },
      { href: "/brand-kit", icon: Palette, label: "Brand Kit"  },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { href: "/settings", icon: Settings, label: "Settings" },
      { href: "/admin",    icon: Shield,   label: "Admin"    },
    ],
  },
] as const;

interface AppSidebarProps {
  user: User;
  creditsRemaining?: number;
  creditsTotal?: number;
}

export function AppSidebar({ user, creditsRemaining = 0, creditsTotal = 3 }: AppSidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  const isEditor = /\/projects\/[^/]+\/edit/.test(pathname);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) {
      setCollapsed(stored === "true");
    } else if (isEditor) {
      setCollapsed(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditor]);

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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "hidden lg:flex h-screen flex-col border-r border-border bg-surface transition-all duration-200 flex-shrink-0 relative",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo + collapse toggle */}
      <div className={cn(
        "flex h-14 items-center border-b border-border flex-shrink-0 gap-2",
        collapsed ? "justify-center px-0" : "px-4"
      )}>
        {!collapsed && <Logo size="sm" />}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-white hover:bg-elevated transition-all",
            !collapsed && "ml-auto"
          )}
        >
          {collapsed
            ? <PanelLeftOpen  className="h-3.5 w-3.5" />
            : <PanelLeftClose className="h-3.5 w-3.5" />
          }
        </button>
      </div>

      {/* New Video CTA */}
      <div className={cn("px-2.5 pt-3 pb-1 flex-shrink-0")}>
        {collapsed ? (
          <Link
            href="/projects/new"
            aria-label="New Video"
            className="flex h-9 w-9 mx-auto items-center justify-center rounded-xl bg-gold-500 text-[#040C0F] hover:bg-gold-400 transition-all shadow-[0_0_12px_rgba(16,200,216,0.3)] hover:shadow-[0_0_18px_rgba(16,200,216,0.5)]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        ) : (
          <Button className="w-full gap-2 shadow-[0_0_12px_rgba(16,200,216,0.2)] hover:shadow-[0_0_18px_rgba(16,200,216,0.35)]" size="sm" asChild>
            <Link href="/projects/new">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              New Video
            </Link>
          </Button>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto scroll-thin py-2 px-2">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.id} className={cn(si > 0 && "mt-4")}>
            {/* Section label — hidden when collapsed */}
            {!collapsed && (
              <p className="px-2.5 mb-1 text-[8.5px] font-bold uppercase tracking-[0.14em] text-muted/60 select-none">
                {section.label}
              </p>
            )}
            {collapsed && si > 0 && (
              <div className="my-1 mx-2 border-t border-border/40" />
            )}

            {section.items.map((item) => {
              const Icon   = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-all duration-100 mb-0.5",
                    collapsed ? "justify-center" : "gap-2.5",
                    active
                      ? "bg-gold-500/10 text-white"
                      : "text-subtle hover:bg-elevated hover:text-white"
                  )}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gold-500 rounded-r-full" />
                  )}
                  <Icon className={cn(
                    "h-[15px] w-[15px] flex-shrink-0 transition-transform duration-100",
                    active ? "text-gold-400" : "text-muted group-hover:text-subtle group-hover:translate-x-px"
                  )} />
                  {!collapsed && (
                    <span className="truncate leading-none">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Credits */}
      {!collapsed ? (
        <div className="mx-2.5 mb-2.5 rounded-xl border border-border bg-elevated/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-gold-500" />
              <span className="text-[10px] font-semibold text-subtle">AI Credits</span>
            </div>
            <span className="text-[10px] font-bold text-gold-400 tabular-nums">
              {creditsRemaining} / {creditsTotal}
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-overlay overflow-hidden">
            <div
              className="h-1 rounded-full bg-gradient-to-r from-gold-500 to-gold-400 transition-all"
              style={{ width: `${Math.min(creditPct, 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[9px] text-muted">
            Free plan ·{" "}
            <Link href="/settings" className="text-gold-500 hover:underline">
              Upgrade →
            </Link>
          </p>
        </div>
      ) : (
        <div className="flex justify-center pb-2">
          <div
            title={`${creditsRemaining} AI credits remaining`}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-elevated text-[10px] font-bold text-gold-400"
          >
            {creditsRemaining}
          </div>
        </div>
      )}

      {/* User */}
      <div className="border-t border-border px-2.5 py-2.5">
        <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gold-500/12 text-[10px] font-bold text-gold-400 border border-gold-500/20">
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium text-white leading-tight">{displayName}</p>
                <p className="truncate text-[9px] text-muted leading-tight">{user.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="flex-shrink-0 text-muted hover:text-ember-500 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
