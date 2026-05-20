import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Mic2,
  Captions,
  Film,
  Music2,
  LayoutTemplate,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Clock,
  Users,
  TrendingUp,
  Globe,
  Play,
} from "lucide-react";

// ─── Hero Section ──────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-32 pb-20">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6 text-center">
        {/* Launch badge */}
        <div className="mb-8 inline-flex animate-fade-in">
          <Badge className="gap-1.5 px-3 py-1 text-xs">
            <Sparkles className="h-3 w-3" />
            Now live in India · AI-powered video creation
          </Badge>
        </div>

        {/* Main headline */}
        <h1 className="animate-fade-up font-display text-5xl font-bold leading-[1.1] tracking-tight md:text-7xl lg:text-8xl">
          <span className="text-gradient-white block">Edit at the</span>
          <span className="text-gradient-gold block">speed of thought.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-lg text-subtle leading-relaxed md:text-xl"
          style={{ animationDelay: "0.1s" }}>
          Turn any idea into a viral video in under 60 seconds.
          AI script, voice, B-roll, captions, music — all automated.
          4-6 hours of editing, done in minutes.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center animate-fade-up"
          style={{ animationDelay: "0.2s" }}>
          <Button size="xl" asChild className="group w-full sm:w-auto">
            <Link href="/auth/signup">
              Start free — no credit card
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button size="xl" variant="outline" asChild className="w-full sm:w-auto">
            <Link href="#how-it-works">
              <Play className="h-4 w-4" />
              See how it works
            </Link>
          </Button>
        </div>

        {/* Trust line */}
        <p className="mt-6 text-sm text-muted animate-fade-in" style={{ animationDelay: "0.3s" }}>
          Free to start · 3 videos/month · No watermark on Pro
        </p>

        {/* Product mockup */}
        <div className="relative mx-auto mt-20 max-w-5xl animate-fade-up" style={{ animationDelay: "0.4s" }}>
          <div className="absolute -inset-4 rounded-3xl bg-gradient-gold opacity-10 blur-2xl" />
          <div className="relative rounded-2xl border border-glow bg-surface p-1 shadow-[0_0_80px_rgba(240,165,0,0.1)]">
            {/* Fake editor UI */}
            <div className="rounded-xl overflow-hidden bg-base">
              {/* Top bar */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-ember-500/60" />
                  <div className="h-3 w-3 rounded-full bg-gold-500/60" />
                  <div className="h-3 w-3 rounded-full bg-green-500/60" />
                </div>
                <div className="h-5 w-64 rounded-md skeleton" />
                <div className="ml-auto flex gap-2">
                  <div className="h-7 w-16 rounded-lg skeleton" />
                  <div className="h-7 w-20 rounded-lg bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-gold-500">Export ↓</span>
                  </div>
                </div>
              </div>

              <div className="flex h-[340px]">
                {/* Left panel */}
                <div className="w-52 border-r border-border p-3 flex flex-col gap-2">
                  {["Script", "Voiceover", "B-Roll", "Captions", "Music", "Text"].map((item, i) => (
                    <div key={item}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors
                        ${i === 0 ? "bg-gold-500/15 text-gold-500 border border-gold-500/20" : "text-subtle hover:bg-elevated"}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-gold-500" : "bg-overlay"}`} />
                      {item}
                    </div>
                  ))}
                </div>

                {/* Preview */}
                <div className="flex-1 flex flex-col items-center justify-center bg-[#0e0e0e] gap-4">
                  <div className="relative">
                    <div className="h-[200px] w-[112px] rounded-xl border border-border bg-elevated flex flex-col items-center justify-center gap-2 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-gold-500/10 to-ember-500/10" />
                      <div className="relative z-10 text-center px-2">
                        <div className="text-[9px] font-bold text-gold-500 mb-1">BOLTCUT AI</div>
                        <div className="text-[7px] text-subtle leading-tight">60-second reel on morning habits of top CEOs</div>
                      </div>
                      <div className="relative z-10 h-8 w-8 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center">
                        <Play className="h-3 w-3 text-gold-500 ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-green-400">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                    AI generated in 23 seconds
                  </div>
                </div>

                {/* Right panel */}
                <div className="w-48 border-l border-border p-3 space-y-3">
                  <div className="text-[10px] font-semibold text-subtle uppercase tracking-wider">AI Assistant</div>
                  <div className="rounded-lg border border-border bg-elevated p-2 text-[10px] text-subtle">
                    &quot;Make the hook more punchy and add 3 more B-roll clips&quot;
                  </div>
                  <div className="h-7 w-full rounded-lg bg-gold-500/15 border border-gold-500/30 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-gold-500">Apply changes</span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {["Script done", "Voice ready", "B-Roll fetched", "Captions added"].map((s) => (
                      <div key={s} className="flex items-center gap-1.5 text-[10px] text-subtle">
                        <CheckCircle2 className="h-2.5 w-2.5 text-green-400" />
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="border-t border-border p-3">
                <div className="flex gap-1 mb-2">
                  {[120, 80, 160, 100, 140, 90, 60].map((w, i) => (
                    <div key={i}
                      className="h-8 rounded-md flex-shrink-0 flex items-center justify-center"
                      style={{
                        width: w,
                        background: i === 2
                          ? "rgba(240,165,0,0.2)"
                          : "rgba(255,255,255,0.04)",
                        border: i === 2
                          ? "1px solid rgba(240,165,0,0.4)"
                          : "1px solid rgba(255,255,255,0.06)"
                      }}>
                      <div className="h-1 w-3/4 rounded-full bg-current opacity-20" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1">
                  <div className="h-5 w-full rounded bg-gold-500/10 border border-gold-500/20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stats Section ─────────────────────────────────────────────────────────────
function StatsSection() {
  const stats = [
    { value: "<60s", label: "Idea to finished video" },
    { value: "10", label: "Languages including 9 Indian" },
    { value: "10", label: "Studio-quality AI voices" },
    { value: "15+", label: "Pro templates included" },
  ];

  return (
    <section className="border-y border-border bg-surface/50 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.value} className="text-center">
              <div className="font-display text-4xl font-bold text-gradient-gold">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-subtle">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features Section ──────────────────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    {
      icon: Zap,
      title: "Prompt to Video",
      description:
        "Type a topic or paste a script. Boltcut builds a complete, production-ready video in seconds — no manual work.",
      color: "gold",
    },
    {
      icon: Mic2,
      title: "AI Voiceover",
      description:
        "Choose from 100+ voices via ElevenLabs. Indian accents, regional languages, emotional styles, and even voice cloning.",
      color: "ember",
    },
    {
      icon: Captions,
      title: "Auto Captions",
      description:
        "Whisper-powered transcription generates animated, styled captions automatically. Multi-language support included.",
      color: "gold",
    },
    {
      icon: Film,
      title: "Smart B-Roll",
      description:
        "AI reads your script, finds matching stock clips from Pexels, and inserts them at the right moments — automatically.",
      color: "ember",
    },
    {
      icon: Music2,
      title: "Beat-Sync Music",
      description:
        "Pick a mood and Boltcut selects background music, then syncs your video cuts to the beat — instantly cinematic.",
      color: "gold",
    },
    {
      icon: LayoutTemplate,
      title: "Flip to All Formats",
      description:
        "One video, three formats. Export 9:16, 16:9, and 1:1 simultaneously with smart reframing for every platform.",
      color: "ember",
    },
  ];

  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <Badge className="mb-4">Features</Badge>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            Everything a creator needs.{" "}
            <span className="text-gradient-gold">Nothing they don&apos;t.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-subtle">
            We&apos;ve replaced hours of manual editing with intelligent automation.
            Every feature is designed to get you from idea to published in minutes.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isGold = feature.color === "gold";
            return (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-border bg-surface p-6 shadow-card transition-all duration-300 hover:border-gold-500/30 hover:shadow-card-hover hover:-translate-y-0.5"
              >
                <div
                  className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${
                    isGold ? "bg-gold-500/15" : "bg-ember-500/15"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isGold ? "text-gold-500" : "text-ember-500"}`}
                  />
                </div>
                <h3 className="mb-2 font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-subtle leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ──────────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      title: "Type your idea",
      description:
        "Give Boltcut a topic, paste a script, upload raw footage, or drop a YouTube link. That's your starting point.",
      icon: Sparkles,
    },
    {
      number: "02",
      title: "AI builds your video",
      description:
        "Boltcut writes the script, records the voiceover, finds B-roll, adds captions, and syncs music — all in under 60 seconds.",
      icon: Zap,
    },
    {
      number: "03",
      title: "Tweak and export",
      description:
        "Make any adjustments in the visual editor or just ask the AI assistant. Then export in all formats at once.",
      icon: TrendingUp,
    },
  ];

  return (
    <section id="how-it-works" className="bg-surface/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <Badge className="mb-4">How it works</Badge>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            Three steps.{" "}
            <span className="text-gradient-gold">One minute.</span>
          </h2>
        </div>

        <div className="relative grid gap-8 md:grid-cols-3">
          {/* Connecting line */}
          <div className="absolute left-1/2 top-14 hidden h-[1px] w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-gold-500/40 to-transparent md:block" />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative text-center">
                <div className="mx-auto mb-6 flex h-28 w-28 flex-col items-center justify-center rounded-3xl border border-gold-500/20 bg-gold-500/5 shadow-glow-gold-sm">
                  <span className="font-display text-xs font-bold text-gold-500/50">
                    {step.number}
                  </span>
                  <Icon className="mt-1 h-8 w-8 text-gold-500" />
                </div>
                <h3 className="mb-3 font-display text-xl font-bold text-white">
                  {step.title}
                </h3>
                <p className="text-sm text-subtle leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Who It's For Section ──────────────────────────────────────────────────────
function AudienceSection() {
  const audiences = [
    {
      icon: Users,
      title: "Content Creators",
      description: "Post 10x more content in the same time. Batch-create an entire week of Reels in one sitting.",
      tags: ["Instagram Reels", "YouTube Shorts", "TikTok"],
    },
    {
      icon: TrendingUp,
      title: "Marketing Teams",
      description: "Brand-consistent videos at scale. Apply your brand kit once, and every video looks on-brand automatically.",
      tags: ["Product Ads", "Brand Videos", "Campaigns"],
    },
    {
      icon: Globe,
      title: "Agencies",
      description: "Manage multiple clients, batch produce, get client approval, and export — all in one platform.",
      tags: ["White-label", "Client Approval", "Bulk Export"],
    },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <Badge className="mb-4">Built for everyone</Badge>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            Whether you create for fun{" "}
            <span className="text-gradient-gold">or for business.</span>
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {audiences.map((a) => {
            const Icon = a.icon;
            return (
              <div key={a.title}
                className="rounded-2xl border border-border bg-surface p-6 shadow-card hover:border-gold-500/20 transition-all">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500/10">
                  <Icon className="h-5 w-5 text-gold-500" />
                </div>
                <h3 className="mb-2 font-semibold text-white">{a.title}</h3>
                <p className="mb-4 text-sm text-subtle">{a.description}</p>
                <div className="flex flex-wrap gap-2">
                  {a.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing Preview ───────────────────────────────────────────────────────────
function PricingSection() {
  const plans = [
    {
      name: "Free",
      price: "₹0",
      period: "forever",
      description: "Try it and see.",
      features: ["3 videos/month", "720p export", "Boltcut watermark", "Stock B-roll", "Auto captions"],
      cta: "Start free",
      href: "/auth/signup",
      highlight: false,
    },
    {
      name: "Creator",
      price: "₹2,499",
      period: "per month",
      description: "For serious creators.",
      features: ["50 AI credits/month", "1080p export", "No watermark", "Voice cloning", "Brand kit", "Beat-sync music"],
      cta: "Get Creator",
      href: "/auth/signup?plan=creator",
      highlight: true,
    },
    {
      name: "Pro",
      price: "₹5,999",
      period: "per month",
      description: "For power users & teams.",
      features: ["200 AI credits/month", "4K export", "5 team seats", "Templates library", "Priority support", "Everything in Creator"],
      cta: "Get Pro",
      href: "/auth/signup?plan=pro",
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="bg-surface/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16 text-center">
          <Badge className="mb-4">Pricing</Badge>
          <h2 className="font-display text-4xl font-bold md:text-5xl">
            Simple, transparent pricing.{" "}
            <span className="text-gradient-gold">Start free.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-subtle">
            No hidden fees. Scale as you grow. Cancel any time.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 ${
                plan.highlight
                  ? "border-glow bg-surface shadow-glow-gold"
                  : "border border-border bg-surface shadow-card"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="shadow-glow-gold-sm">Most popular</Badge>
                </div>
              )}
              <div className="mb-6">
                <h3 className="font-semibold text-white">{plan.name}</h3>
                <div className="mt-2 flex items-end gap-1">
                  <span className="font-display text-4xl font-bold text-white">{plan.price}</span>
                  <span className="mb-1 text-sm text-subtle">/{plan.period}</span>
                </div>
                <p className="mt-1 text-sm text-subtle">{plan.description}</p>
              </div>
              <Button
                className="w-full"
                variant={plan.highlight ? "default" : "outline"}
                asChild
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-subtle">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Section ───────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-3xl border-glow bg-surface p-12 text-center shadow-glow-gold">
          <div className="pointer-events-none absolute inset-0 bg-gradient-radial-gold" />
          <div className="relative">
            <h2 className="font-display text-4xl font-bold md:text-5xl">
              Your first video is{" "}
              <span className="text-gradient-gold">60 seconds away.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-subtle">
              Join creators and marketers across India who&apos;ve already switched to AI-powered video creation.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="xl" asChild className="group w-full sm:w-auto">
                <Link href="/auth/signup">
                  Start for free
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted">
              No credit card · 3 free videos · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="min-h-screen bg-base">
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <AudienceSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
