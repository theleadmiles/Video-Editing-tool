"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, RefreshCw, Users, Film, Zap } from "lucide-react";

interface WorkspaceRow {
  id: string;
  name: string;
  plan: string;
  credits_remaining: number;
  owner_id: string;
  created_at: string;
  email: string;
  full_name: string | null;
  project_count: number;
}

interface AdminPanelProps {
  workspaces: WorkspaceRow[];
  currentUserId: string;
}

export function AdminPanel({ workspaces, currentUserId }: AdminPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [credits, setCredits] = useState<Record<string, number>>(
    Object.fromEntries(workspaces.map((w) => [w.id, w.credits_remaining]))
  );
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    Object.fromEntries(workspaces.map((w) => [w.id, "3"]))
  );

  async function resetCredits(workspaceId: string, amount: number) {
    setLoading(workspaceId);
    try {
      const res = await fetch("/api/admin/reset-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, amount }),
      });
      if (!res.ok) throw new Error();
      setCredits((prev) => ({ ...prev, [workspaceId]: amount }));
      toast.success(`Credits reset to ${amount}`);
    } catch {
      toast.error("Failed to reset credits");
    } finally {
      setLoading(null);
    }
  }

  const totalProjects = workspaces.reduce((sum, w) => sum + w.project_count, 0);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ember-500/15">
          <Shield className="h-5 w-5 text-ember-500" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-sm text-subtle">Internal testing tools — not visible to regular users</p>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        {[
          { icon: Users, label: "Total accounts", value: workspaces.length },
          { icon: Film, label: "Total projects", value: totalProjects },
          { icon: Zap, label: "Avg credits left", value: workspaces.length
            ? Math.round(workspaces.reduce((s, w) => s + credits[w.id], 0) / workspaces.length)
            : 0 },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center gap-2 text-subtle mb-3">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
              <span className="font-display text-3xl font-bold text-white">{stat.value}</span>
            </div>
          );
        })}
      </div>

      {/* Workspaces table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-white">Workspaces</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">User</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Plan</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Projects</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Credits</th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">Reset credits</th>
            </tr>
          </thead>
          <tbody>
            {workspaces.map((ws, i) => (
              <tr
                key={ws.id}
                className={`${i < workspaces.length - 1 ? "border-b border-border" : ""} ${ws.owner_id === currentUserId ? "bg-gold-500/5" : ""}`}
              >
                <td className="px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-white flex items-center gap-2">
                      {ws.full_name || ws.email.split("@")[0]}
                      {ws.owner_id === currentUserId && (
                        <Badge variant="secondary" className="text-[9px]">You</Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted">{ws.email}</p>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Badge variant={ws.plan === "free" ? "secondary" : "default"} className="capitalize">
                    {ws.plan}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-sm text-subtle">{ws.project_count}</td>
                <td className="px-5 py-4">
                  <span className={`text-sm font-semibold ${credits[ws.id] === 0 ? "text-ember-500" : "text-gold-500"}`}>
                    {credits[ws.id]}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={customAmounts[ws.id]}
                      onChange={(e) => setCustomAmounts((prev) => ({ ...prev, [ws.id]: e.target.value }))}
                      className="w-14 rounded-lg border border-border bg-elevated px-2 py-1 text-xs text-white text-center focus:border-gold-500 focus:outline-none"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      loading={loading === ws.id}
                      onClick={() => resetCredits(ws.id, parseInt(customAmounts[ws.id]) || 3)}
                      className="gap-1.5 text-xs"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Reset
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {workspaces.length === 0 && (
          <div className="py-12 text-center text-sm text-muted">No workspaces found</div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted text-center">
        Set <code className="bg-elevated px-1 rounded">ADMIN_EMAILS</code> in your .env.local to restrict this page to specific accounts.
      </p>
    </div>
  );
}
