"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface AppSidebarProps {
  user: User;
  creditsRemaining?: number;
  creditsTotal?: number;
}

export function AppSidebar({ user, creditsRemaining = 0, creditsTotal = 3 }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/");
    router.refresh();
  }

  const displayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <aside className="hidden lg:flex h-screen w-60 flex-col border-r border-border bg-surface">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-5">
        <Logo size="sm" />
      </div>

      {/* Create button */}
      <div className="p-3">
        <Button className="w-full gap-2" asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" />
            New Video
          </Link>
        </Button>
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
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
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

      {/* Credits bar */}
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
            className="h-1.5 rounded-full bg-gradient-gold transition-all"
            style={{ width: `${creditsTotal > 0 ? (creditsRemaining / creditsTotal) * 100 : 0}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-muted">
          Free plan · <Link href="/settings" className="text-gold-500 hover:underline">Upgrade</Link>
        </p>
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
    </aside>
  );
}
