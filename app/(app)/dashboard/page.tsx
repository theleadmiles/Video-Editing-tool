import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import { OnboardingChecklist } from "@/components/shared/onboarding-checklist";
import {
  Plus, Clock, Zap, TrendingUp,
  Film, ArrowRight, Sparkles,
} from "lucide-react";

const quickStartOptions = [
  {
    icon: Sparkles,
    title: "From a topic",
    description: "Type a topic and AI builds the full video",
    href: "/projects/new?mode=topic",
    color: "gold",
  },
  {
    icon: Film,
    title: "Upload footage",
    description: "AI edits your raw clips automatically",
    href: "/projects/new?mode=upload",
    color: "ember",
  },
  {
    icon: Zap,
    title: "Use a template",
    description: "Start from a professional template",
    href: "/templates",
    color: "gold",
  },
];

const statusVariant: Record<string, "default" | "secondary" | "success"> = {
  draft: "secondary",
  ready: "default",
  exported: "success",
  generating: "secondary",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  // Fetch workspace for credits
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("credits_remaining, plan")
    .eq("owner_id", user!.id)
    .single();

  // Fetch real projects (just the 5 most recent for the table)
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, duration_seconds, aspect_ratio, thumbnail_url, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(5);

  // Separately count ALL projects for the stat — not just the 5 we fetched above
  const { count: totalVideoCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true });

  const totalVideos = totalVideoCount ?? 0;
  const planCreditsTotal: Record<string, number> = { free: 3, creator: 30, pro: 100, team: 250, agency: 1000 };
  const planTotal = planCreditsTotal[workspace?.plan ?? "free"] ?? 3;
  const creditsUsed = planTotal - (workspace?.credits_remaining ?? planTotal);
  const timeSaved = Math.round(totalVideos * 1.5);

  // Derive completed onboarding steps from DB
  const completedOnboarding: string[] = [];
  if (totalVideos > 0) completedOnboarding.push("first_video");

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Welcome back, {displayName} 👋
          </h1>
          <p className="mt-1 text-sm text-subtle">What are we creating today?</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" />
            New Video
          </Link>
        </Button>
      </div>

      {/* Onboarding checklist — only shows for new users, hides once dismissed */}
      <OnboardingChecklist completedItems={completedOnboarding} />

      {/* Quick start */}
      <section className="mb-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted">
          Quick start
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {quickStartOptions.map((option) => {
            const Icon = option.icon;
            const isGold = option.color === "gold";
            return (
              <Link
                key={option.href}
                href={option.href}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 shadow-card transition-all duration-200 hover:border-gold-500/30 hover:shadow-card-hover hover:-translate-y-0.5"
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isGold ? "bg-gold-500/15" : "bg-ember-500/15"}`}>
                  <Icon className={`h-5 w-5 ${isGold ? "text-gold-500" : "text-ember-500"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{option.title}</p>
                  <p className="mt-0.5 text-xs text-subtle">{option.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-gold-500" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* Stats */}
      <section className="mb-10">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Film, label: "Videos created", value: String(totalVideos), sub: "total" },
            { icon: Clock, label: "Time saved", value: `${timeSaved} hrs`, sub: "vs manual editing" },
            { icon: TrendingUp, label: "AI credits used", value: `${creditsUsed} / ${planTotal}`, sub: workspace?.plan || "free plan" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
                <div className="flex items-center gap-2 text-subtle">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">{stat.label}</span>
                </div>
                <div className="mt-3">
                  <span className="font-display text-3xl font-bold text-white">{stat.value}</span>
                  <span className="ml-2 text-xs text-muted">{stat.sub}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent projects */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Recent projects
          </h2>
          {(projects?.length || 0) > 0 && (
            <Link href="/projects" className="text-xs text-subtle hover:text-gold-500 transition-colors">
              View all →
            </Link>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-card">
          {!projects?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gold-500/10">
                <Sparkles className="h-9 w-9 text-gold-500" />
                <div className="absolute inset-0 rounded-3xl bg-gold-500/5 animate-glow-pulse" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">Make your first video</h3>
              <p className="mt-1.5 max-w-xs text-sm text-subtle leading-relaxed">
                Type a topic and Boltcut writes the script, picks the voice, and pulls B-roll — all in under a minute.
              </p>
              <Button className="mt-5" asChild>
                <Link href="/projects/new">
                  <Plus className="h-4 w-4" />
                  Create your first video
                </Link>
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Project</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Duration</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Format</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {projects.map((project, i) => (
                  <tr
                    key={project.id}
                    className={`${i < projects.length - 1 ? "border-b border-border" : ""} hover:bg-elevated/50 transition-colors`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 rounded-lg bg-elevated border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {(project as { thumbnail_url?: string | null }).thumbnail_url ? (
                            <img
                              src={(project as { thumbnail_url?: string | null }).thumbnail_url!}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Film className="h-4 w-4 text-muted" />
                          )}
                        </div>
                        <span className="font-medium text-white text-sm line-clamp-1 max-w-[180px]">
                          {project.title || "Untitled"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={statusVariant[project.status] || "secondary"}>
                        {project.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-subtle">
                      {project.duration_seconds ? formatDuration(project.duration_seconds) : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-subtle">{project.aspect_ratio}</td>
                    <td className="px-5 py-4 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/projects/${project.id}/edit`}>Open</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
