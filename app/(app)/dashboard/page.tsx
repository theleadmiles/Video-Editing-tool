import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { OnboardingChecklist } from "@/components/shared/onboarding-checklist";
import {
  Plus, Clock, Zap, TrendingUp,
  Film, ArrowRight, Sparkles, Play,
} from "lucide-react";

const quickStartOptions = [
  {
    icon: Sparkles,
    title: "From a topic",
    description: "Type a topic, AI writes script + picks voice + pulls B-roll",
    href: "/projects/new?mode=topic",
    gradient: "from-[#10C8D8]/20 to-[#076880]/10",
    iconBg: "bg-[#10C8D8]/15",
    iconColor: "text-[#10C8D8]",
    accent: "#10C8D8",
  },
  {
    icon: Film,
    title: "Upload footage",
    description: "Drop your raw clips, AI edits and captions automatically",
    href: "/projects/new?mode=upload",
    gradient: "from-ember-500/20 to-ember-500/5",
    iconBg: "bg-ember-500/15",
    iconColor: "text-ember-500",
    accent: "#F26E50",
  },
  {
    icon: Zap,
    title: "Use a template",
    description: "Start from a pro template, customise in seconds",
    href: "/templates",
    gradient: "from-violet-500/15 to-violet-500/5",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
    accent: "#A78BFA",
  },
];

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  ready:       { dot: "bg-green-400",   text: "text-green-400",   bg: "bg-green-400/10 border-green-400/20" },
  exported:    { dot: "bg-blue-400",    text: "text-blue-400",    bg: "bg-blue-400/10 border-blue-400/20" },
  draft:       { dot: "bg-subtle",      text: "text-subtle",      bg: "bg-subtle/10 border-border" },
  processing:  { dot: "bg-amber-400 animate-pulse", text: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  generating:  { dot: "bg-amber-400 animate-pulse", text: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  error:       { dot: "bg-ember-500",   text: "text-ember-500",   bg: "bg-ember-500/10 border-ember-500/20" },
};

const ASPECT_RATIO_DIMS: Record<string, { w: number; h: number }> = {
  "9:16": { w: 9,  h: 16 },
  "16:9": { w: 16, h: 9  },
  "1:1":  { w: 1,  h: 1  },
  "4:5":  { w: 4,  h: 5  },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  const [
    { data: workspace },
    { data: projects },
    { count: totalVideoCount },
  ] = await Promise.all([
    supabase
      .from("workspaces")
      .select("credits_remaining, plan")
      .eq("owner_id", user!.id)
      .single(),
    supabase
      .from("projects")
      .select("id, title, status, duration_seconds, aspect_ratio, thumbnail_url, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(9),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true }),
  ]);

  const totalVideos    = totalVideoCount ?? 0;
  const planCreditsTotal: Record<string, number> = { free: 3, creator: 30, pro: 100, team: 250, agency: 1000 };
  const planTotal      = planCreditsTotal[workspace?.plan ?? "free"] ?? 3;
  const creditsUsed    = planTotal - (workspace?.credits_remaining ?? planTotal);
  const timeSaved      = Math.round(totalVideos * 1.5);
  const completedOnboarding: string[] = [];
  if (totalVideos > 0) completedOnboarding.push("first_video");

  return (
    <div className="min-h-full p-6 lg:p-8 max-w-[1200px]">

      {/* ── Header ── */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white leading-tight">
            Welcome back, {displayName} 👋
          </h1>
          <p className="mt-1 text-sm text-subtle">What are we creating today?</p>
        </div>
        <Button asChild className="flex-shrink-0 shadow-[0_0_14px_rgba(16,200,216,0.2)]">
          <Link href="/projects/new">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            New Video
          </Link>
        </Button>
      </div>

      {/* ── Onboarding ── */}
      <OnboardingChecklist completedItems={completedOnboarding} />

      {/* ── Quick Start ── */}
      <section className="mb-8">
        <SectionHeader>Quick start</SectionHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          {quickStartOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Link
                key={option.href}
                href={option.href}
                className={cn(
                  "group relative flex items-start gap-4 rounded-2xl border border-border bg-gradient-to-br p-5 transition-all duration-200",
                  "hover:border-white/10 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
                  option.gradient
                )}
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${option.iconBg} transition-transform group-hover:scale-110`}>
                  <Icon className={`h-5 w-5 ${option.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white text-sm leading-tight">{option.title}</p>
                  <p className="mt-1 text-[11px] text-subtle leading-relaxed">{option.description}</p>
                </div>
                <ArrowRight
                  className="h-4 w-4 flex-shrink-0 text-muted transition-all group-hover:translate-x-1 mt-0.5"
                  style={{ color: option.accent }}
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="mb-8">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Film, label: "Videos created",
              value: String(totalVideos), sub: "total",
              color: "text-[#10C8D8]", bg: "bg-[#10C8D8]/10",
            },
            {
              icon: Clock, label: "Time saved",
              value: `${timeSaved} hrs`, sub: "vs manual editing",
              color: "text-violet-400", bg: "bg-violet-500/10",
            },
            {
              icon: TrendingUp, label: "AI credits used",
              value: `${creditsUsed}`, sub: `of ${planTotal} on ${workspace?.plan || "free"} plan`,
              color: "text-amber-400", bg: "bg-amber-500/10",
              progress: planTotal > 0 ? (creditsUsed / planTotal) * 100 : 0,
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {stat.label}
                  </span>
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${stat.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-display text-3xl font-bold text-white leading-none tabular-nums">
                    {stat.value}
                  </span>
                  <span className="text-[10px] text-muted mb-0.5 leading-relaxed">{stat.sub}</span>
                </div>
                {"progress" in stat && stat.progress !== undefined && (
                  <div className="mt-3 h-1 w-full rounded-full bg-overlay overflow-hidden">
                    <div
                      className="h-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                      style={{ width: `${Math.min(stat.progress, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Recent Projects ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <SectionHeader className="mb-0">Recent projects</SectionHeader>
          {(projects?.length || 0) > 0 && (
            <Link
              href="/projects"
              className="text-[11px] font-medium text-subtle hover:text-gold-400 transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {!projects?.length ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-20 text-center shadow-card">
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gold-500/10">
              <Sparkles className="h-9 w-9 text-gold-500" />
              <div className="absolute inset-0 rounded-3xl bg-gold-500/5 animate-glow-pulse" />
            </div>
            <h3 className="font-display text-lg font-semibold text-white">Make your first video</h3>
            <p className="mt-2 max-w-xs text-sm text-subtle leading-relaxed">
              Type a topic and Boltcut writes the script, picks the voice, and pulls B-roll — all in under a minute.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/projects/new">
                <Plus className="h-4 w-4" />
                Create your first video
              </Link>
            </Button>
          </div>
        ) : (
          /* Card grid */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const ratio = ASPECT_RATIO_DIMS[project.aspect_ratio] ?? { w: 16, h: 9 };
              const statusStyle = STATUS_STYLES[project.status] ?? STATUS_STYLES.draft;
              const thumbUrl = (project as { thumbnail_url?: string | null }).thumbnail_url;
              const isPortrait = ratio.h > ratio.w;

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}/edit`}
                  className="group relative flex flex-col rounded-2xl border border-border bg-surface overflow-hidden shadow-card transition-all duration-200 hover:border-gold-500/30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:-translate-y-0.5"
                >
                  {/* Thumbnail area */}
                  <div
                    className={cn(
                      "relative w-full overflow-hidden bg-elevated flex items-center justify-center",
                      isPortrait ? "h-40" : "h-36"
                    )}
                  >
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt=""
                        className={cn(
                          "transition-transform duration-300 group-hover:scale-105",
                          isPortrait ? "h-full w-auto object-cover" : "w-full h-full object-cover"
                        )}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-12 w-12 rounded-2xl bg-[#10C8D8]/10 flex items-center justify-center">
                          <Film className="h-5 w-5 text-[#10C8D8]/60" />
                        </div>
                        <span className="text-[10px] text-muted">{project.aspect_ratio}</span>
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {/* Play button on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
                        <Play className="h-4 w-4 text-white fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Status chip — top right */}
                    <div className={cn(
                      "absolute top-2 right-2 flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold backdrop-blur-sm",
                      statusStyle.bg, statusStyle.text
                    )}>
                      <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", statusStyle.dot)} />
                      {project.status}
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="flex items-center gap-2 px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white text-sm truncate leading-tight">
                        {project.title || "Untitled"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {project.duration_seconds ? (
                          <span className="text-[10px] text-muted tabular-nums">
                            {formatDuration(project.duration_seconds)}
                          </span>
                        ) : null}
                        {project.aspect_ratio && (
                          <span className="text-[10px] text-muted/60">{project.aspect_ratio}</span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5 text-gold-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted", className)}>
      {children}
    </h2>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
