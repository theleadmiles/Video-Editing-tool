"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Mail, Lock, User, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const perks = [
  "3 free videos every month",
  "AI voiceover in 10+ Indian voices",
  "Auto captions + B-roll",
  "No credit card required",
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
    }
    setLoading(false);
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-base px-6">
        <div className="pointer-events-none fixed inset-0 bg-gradient-hero" />
        <div className="relative w-full max-w-sm text-center">
          <div className="mb-6 flex justify-center">
            <Logo size="md" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">Check your email</h2>
            <p className="mt-2 text-sm text-subtle">
              We sent a confirmation link to{" "}
              <span className="font-medium text-white">{email}</span>. Click the link to activate your account.
            </p>
            <Button variant="outline" className="mt-6 w-full" asChild>
              <Link href="/auth/login">Back to sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-base">
      <div className="pointer-events-none fixed inset-0 bg-gradient-hero" />

      {/* Left — Form */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Link href="/">
              <Logo size="md" />
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-8 shadow-card">
            <div className="mb-6 text-center">
              <h1 className="font-display text-2xl font-bold text-white">Create your account</h1>
              <p className="mt-1 text-sm text-subtle">Start making videos in 60 seconds</p>
            </div>

            <Button
              variant="outline"
              className="w-full gap-3"
              onClick={handleGoogleSignup}
              loading={googleLoading}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </Button>

            <div className="my-6 flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="text-xs text-muted">or</span>
              <Separator className="flex-1" />
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <Input
                type="text"
                label="Full name"
                placeholder="Aarav Shah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<User className="h-4 w-4" />}
                required
              />
              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                required
              />
              <div>
                <Input
                  type="password"
                  label="Password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="h-4 w-4" />}
                  required
                  minLength={8}
                  aria-describedby="password-hint"
                />
                {password.length > 0 && (
                  <p
                    id="password-hint"
                    className={cn(
                      "mt-1.5 text-xs flex items-center gap-1 transition-colors",
                      password.length >= 8 ? "text-green-400" : "text-muted"
                    )}
                  >
                    {password.length >= 8 ? <CheckCircle2 className="h-3 w-3" /> : <span className="inline-block h-1 w-1 rounded-full bg-current" />}
                    {password.length >= 8 ? "Strong enough" : `${password.length} / 8 characters`}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" loading={loading}>
                Create free account
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="hover:text-white">Terms</Link>{" "}
              and{" "}
              <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>.
            </p>
          </div>

          <p className="mt-4 text-center text-sm text-subtle">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-semibold text-gold-500 hover:text-gold-400 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right — Perks (hidden on mobile) */}
      <div className="relative hidden flex-col items-center justify-center bg-surface/50 px-12 lg:flex lg:w-[420px]">
        <div className="max-w-xs">
          <h2 className="font-display text-3xl font-bold text-white">
            Create videos <span className="text-gradient-gold">10x faster</span> with AI.
          </h2>
          <ul className="mt-8 space-y-4">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-sm text-subtle">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-400" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
