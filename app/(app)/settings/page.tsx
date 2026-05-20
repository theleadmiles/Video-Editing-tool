"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Shield, Zap, Lock, Eye, EyeOff, Mail } from "lucide-react";

const planCreditsTotal: Record<string, number> = {
  free: 3, creator: 30, pro: 100, team: 250, agency: 1000,
};

const planFeatures: Record<string, string[]> = {
  free: ["3 AI credits / month", "720p export", "Watermark on videos", "Basic templates"],
  creator: ["30 AI credits / month", "1080p export", "No watermark", "All templates", "Priority support"],
  pro: ["100 AI credits / month", "1080p export", "No watermark", "All templates + brand kit", "API access"],
  team: ["250 AI credits / month", "4K export", "Team collaboration", "Custom branding"],
  agency: ["1000 AI credits / month", "4K export", "White label", "Dedicated support"],
};

export default function SettingsPage() {
  const supabase = createClient();

  // Profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Plan state
  const [creditsRemaining, setCreditsRemaining] = useState(0);
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setName(user.user_metadata?.full_name || "");
        setEmail(user.email || "");
        const { data: ws } = await supabase
          .from("workspaces")
          .select("credits_remaining, plan")
          .eq("owner_id", user.id)
          .single();
        if (ws) {
          setCreditsRemaining(ws.credits_remaining ?? 0);
          setPlan(ws.plan ?? "free");
        }
      }
    }
    load();
  }, []);

  async function handleSaveProfile() {
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (error) toast.error(error.message);
    else toast.success("Profile updated!");
    setSavingProfile(false);
  }

  async function handleChangePassword() {
    if (!newPassword) { toast.error("Enter a new password"); return; }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSavingPassword(false);
    }
  }

  const creditsUsed = planCreditsTotal[plan] - creditsRemaining;
  const creditsPercent = planCreditsTotal[plan] > 0
    ? (creditsRemaining / planCreditsTotal[plan]) * 100
    : 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-subtle">Manage your account and preferences.</p>
      </div>

      <div className="max-w-xl space-y-6">

        {/* Profile */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-5 flex items-center gap-2">
            <User className="h-4 w-4 text-gold-500" />
            <h2 className="font-semibold text-white">Profile</h2>
          </div>
          <div className="space-y-4">
            <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            <Input label="Email" value={email} readOnly className="opacity-60 cursor-not-allowed" />
            <p className="text-xs text-muted">Email cannot be changed. Contact support if needed.</p>
          </div>
          <Button className="mt-4" onClick={handleSaveProfile} loading={savingProfile}>
            Save profile
          </Button>
        </section>

        {/* Password */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-5 flex items-center gap-2">
            <Lock className="h-4 w-4 text-gold-500" />
            <h2 className="font-semibold text-white">Change Password</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-subtle">New password</label>
              <div className="relative">
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-border bg-elevated px-4 py-2.5 pr-10 text-sm text-white placeholder:text-muted focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                >
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-subtle">Confirm new password</label>
              <div className="relative">
                <input
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full rounded-xl border border-border bg-elevated px-4 py-2.5 pr-10 text-sm text-white placeholder:text-muted focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                >
                  {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-ember-500">Passwords don&apos;t match</p>
            )}
            {newPassword.length > 0 && newPassword.length < 8 && (
              <p className="text-xs text-ember-500">Must be at least 8 characters</p>
            )}
          </div>
          <Button
            className="mt-4"
            onClick={handleChangePassword}
            loading={savingPassword}
            disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
          >
            Update password
          </Button>
        </section>

        {/* Plan */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-5 flex items-center gap-2">
            <Zap className="h-4 w-4 text-gold-500" />
            <h2 className="font-semibold text-white">Plan & Credits</h2>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-white capitalize">{plan} Plan</p>
                <Badge variant="secondary">Current</Badge>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/#pricing">View plans</Link>
            </Button>
          </div>

          {/* Features */}
          <div className="mb-4 space-y-1.5">
            {(planFeatures[plan] || planFeatures.free).map((f) => (
              <div key={f} className="flex items-center gap-2 text-xs text-subtle">
                <span className="text-gold-500">✓</span>
                {f}
              </div>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-subtle">AI credits used this month</span>
            <span className="font-semibold text-gold-500">{creditsUsed} / {planCreditsTotal[plan]}</span>
          </div>
          <div className="h-2 rounded-full bg-overlay">
            <div
              className="h-2 rounded-full bg-gradient-gold transition-all"
              style={{ width: `${creditsPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {creditsRemaining} credit{creditsRemaining !== 1 ? "s" : ""} remaining · resets monthly
          </p>
        </section>

        {/* Account deletion */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-5 flex items-center gap-2">
            <Shield className="h-4 w-4 text-subtle" />
            <h2 className="font-semibold text-white">Delete account</h2>
          </div>
          <p className="text-sm text-subtle mb-4 leading-relaxed">
            To permanently delete your account and all videos, email us from your account address. We&apos;ll process deletion within 24 hours.
          </p>
          <Button variant="outline" asChild>
            <a href="mailto:support@boltcut.ai?subject=Delete%20my%20Boltcut%20account">
              <Mail className="h-4 w-4" />
              Email support
            </a>
          </Button>
        </section>
      </div>
    </div>
  );
}
