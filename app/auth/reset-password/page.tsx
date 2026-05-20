"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated! Redirecting...");
      router.push("/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base px-6">
      <div className="pointer-events-none fixed inset-0 bg-gradient-hero" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Logo size="md" />
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-bold text-white">Set new password</h1>
            <p className="mt-1 text-sm text-subtle">Choose a strong password for your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              label="New password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              required
            />
            <Input
              type="password"
              label="Confirm password"
              placeholder="Repeat your new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              required
            />
            <Button type="submit" className="w-full" loading={loading}>
              Update password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
