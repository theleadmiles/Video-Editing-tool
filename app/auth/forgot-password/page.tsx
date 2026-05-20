"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
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
          {sent ? (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/10">
                  <CheckCircle2 className="h-7 w-7 text-gold-500" />
                </div>
              </div>
              <h1 className="font-display text-xl font-bold text-white">Check your email</h1>
              <p className="mt-2 text-sm text-subtle">
                We sent a password reset link to <span className="text-white">{email}</span>. Check your inbox and follow the instructions.
              </p>
              <Link
                href="/auth/login"
                className="mt-6 flex items-center justify-center gap-2 text-sm text-subtle hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="font-display text-2xl font-bold text-white">Forgot password?</h1>
                <p className="mt-1 text-sm text-subtle">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  label="Email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail className="h-4 w-4" />}
                  required
                />
                <Button type="submit" className="w-full" loading={loading}>
                  Send reset link
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/auth/login"
                  className="flex items-center justify-center gap-2 text-sm text-subtle hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
