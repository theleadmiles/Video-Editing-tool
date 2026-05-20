"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FEATURED_VOICES, MUSIC_MOODS } from "@/lib/ai/elevenlabs";
import { toast } from "sonner";
import {
  Sparkles, FileText, Upload, Link2,
  ChevronRight, ChevronLeft, Zap,
  Mic2, Music2, Clock, Ratio,
  CheckCircle2, AlertTriangle, Play, Square, Globe,
  Captions,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Confetti } from "@/components/shared/confetti";

type InputMode = "topic" | "script" | "upload" | "url";
type Step = 1 | 2 | 3;

// "upload" mode navigates away to /projects/caption — it's handled specially below
const INPUT_MODES = [
  { id: "topic", icon: Sparkles, label: "Topic / Idea", desc: "Type a topic — AI writes everything" },
  { id: "script", icon: FileText, label: "My Script", desc: "Paste your own script" },
  { id: "upload", icon: Captions, label: "Caption my video", desc: "Upload your video, AI adds captions" },
  { id: "url", icon: Link2, label: "URL / Link", desc: "YouTube, blog post, article" },
];

const DURATIONS = [
  { value: 15, label: "15 sec", badge: "Hook" },
  { value: 30, label: "30 sec", badge: "Reel" },
  { value: 45, label: "45 sec", badge: "Popular" },
  { value: 60, label: "60 sec", badge: "Long" },
];

const ASPECT_RATIOS = [
  { value: "9:16", label: "9:16", desc: "Reels / Shorts", icon: "▯" },
  { value: "16:9", label: "16:9", desc: "YouTube", icon: "▭" },
  { value: "1:1", label: "1:1", desc: "Feed post", icon: "□" },
];

const TONES = [
  { value: "energetic", label: "Energetic", emoji: "⚡" },
  { value: "professional", label: "Professional", emoji: "💼" },
  { value: "casual", label: "Casual", emoji: "😊" },
  { value: "cinematic", label: "Cinematic", emoji: "🎬" },
  { value: "educational", label: "Educational", emoji: "📚" },
  { value: "emotional", label: "Emotional", emoji: "💫" },
];

const LANGUAGES = [
  { value: "English", label: "English", flag: "🇬🇧" },
  { value: "Hindi", label: "हिन्दी", flag: "🇮🇳" },
  { value: "Tamil", label: "தமிழ்", flag: "🇮🇳" },
  { value: "Telugu", label: "తెలుగు", flag: "🇮🇳" },
  { value: "Bengali", label: "বাংলা", flag: "🇮🇳" },
  { value: "Kannada", label: "ಕನ್ನಡ", flag: "🇮🇳" },
  { value: "Marathi", label: "मराठी", flag: "🇮🇳" },
  { value: "Punjabi", label: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { value: "Malayalam", label: "മലയാളം", flag: "🇮🇳" },
  { value: "Gujarati", label: "ગુજરાતી", flag: "🇮🇳" },
];

const GENERATION_STEPS = [
  { key: "script", label: "Writing script with AI", icon: "📝" },
  { key: "voiceover", label: "Generating voiceover", icon: "🎙️" },
  { key: "broll", label: "Fetching B-roll footage", icon: "🎬" },
  { key: "music", label: "Finding background music", icon: "🎵" },
  { key: "captions", label: "Generating captions", icon: "💬" },
  { key: "assembling", label: "Assembling your video", icon: "✨" },
  { key: "done", label: "Ready!", icon: "🚀" },
];

function NewProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Step state
  const [step, setStep] = useState<Step>(1);
  const [generating, setGenerating] = useState(false);
  const [currentGenStep, setCurrentGenStep] = useState(0);
  const [genPercent, setGenPercent] = useState(0);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [urlFetching, setUrlFetching] = useState(false);

  // Voice preview state
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Phase 17: cloned voices from Voice Lab
  type ClonedVoice = { voice_id: string; name: string; description: string | null; accent: string | null; sample_url: string };
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/voice-clone");
        const data = await res.json();
        setClonedVoices(data.voices || []);
      } catch { /* silent */ }
    })();
  }, []);

  // Confetti trigger
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  // Smoothed display percent — interpolates toward genPercent for fluid motion
  const [displayPercent, setDisplayPercent] = useState(0);
  useEffect(() => {
    let raf: number;
    function tick() {
      setDisplayPercent((current) => {
        const diff = genPercent - current;
        if (Math.abs(diff) < 0.1) return genPercent;
        return current + diff * 0.08;
      });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [genPercent]);

  // Form state — pre-filled from template params if present
  const [inputMode, setInputMode] = useState<InputMode>("topic");
  const [topic, setTopic] = useState(searchParams.get("topic") || "");
  const [voiceId, setVoiceId] = useState(FEATURED_VOICES[0].voice_id);
  const [musicMood, setMusicMood] = useState("upbeat");
  const [duration, setDuration] = useState(Number(searchParams.get("duration")) || 45);
  const [aspectRatio, setAspectRatio] = useState(searchParams.get("aspectRatio") || "9:16");
  const [tone, setTone] = useState(searchParams.get("tone") || "energetic");
  const [language, setLanguage] = useState("English");

  const fromTemplate = !!searchParams.get("topic");

  useEffect(() => {
    async function loadCreditsAndBrandKit() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ws } = await supabase
        .from("workspaces")
        .select("id, credits_remaining")
        .eq("owner_id", user.id)
        .single();

      if (!ws) return;
      setCreditsRemaining(ws.credits_remaining ?? 0);

      // Pre-fill voice from brand kit if user has one saved
      if (!searchParams.get("topic")) { // don't override template defaults
        const { data: kit } = await supabase
          .from("brand_kits")
          .select("default_voice_id")
          .eq("workspace_id", ws.id)
          .single();
        if (kit?.default_voice_id) {
          setVoiceId(kit.default_voice_id);
        }
      }
    }
    loadCreditsAndBrandKit();
  }, []);

  // Stop voice preview when unmounting
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);

  async function previewVoice(vId: string) {
    // Stop any currently playing preview
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }

    if (previewingVoice === vId) {
      setPreviewingVoice(null);
      return;
    }

    setPreviewingVoice(vId);
    try {
      const audio = new Audio(`/api/voice-sample?voiceId=${vId}`);
      previewAudioRef.current = audio;
      audio.onended = () => setPreviewingVoice(null);
      audio.onerror = () => {
        setPreviewingVoice(null);
        toast.error("Preview not available");
      };
      await audio.play();
    } catch {
      setPreviewingVoice(null);
      toast.error("Could not play preview");
    }
  }

  async function fetchUrlContent() {
    if (!topic.trim()) { toast.error("Please enter a URL first"); return false; }
    let url = topic.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    setUrlFetching(true);
    try {
      const res = await fetch("/api/scrape-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read that URL");
      setTopic(data.text);
      setInputMode("script"); // switch to script mode with the scraped content
      toast.success("Content extracted! Review and continue.");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read URL");
      return false;
    } finally {
      setUrlFetching(false);
    }
  }

  const STEP_ORDER = ["script", "voiceover", "broll", "music", "captions", "assembling", "done"];

  async function handleGenerate() {
    if (!topic.trim()) {
      toast.error("Please enter a topic or script");
      return;
    }

    setGenerating(true);
    setCurrentGenStep(0);
    setGenPercent(5);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, voiceId, musicMood, durationSeconds: duration, aspectRatio, tone, language }),
      });

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const chunk of lines) {
          const eventMatch = chunk.match(/^event: (\w+)/m);
          const dataMatch = chunk.match(/^data: (.+)/m);
          if (!eventMatch || !dataMatch) continue;

          const event = eventMatch[1];
          const data = JSON.parse(dataMatch[1]);

          if (event === "progress") {
            const stepIdx = STEP_ORDER.indexOf(data.step);
            if (stepIdx >= 0) setCurrentGenStep(stepIdx);
            setGenPercent(data.percent || 0);
          } else if (event === "done") {
            setCurrentGenStep(STEP_ORDER.length - 1);
            setGenPercent(100);
            setConfettiTrigger(Date.now()); // celebrate!
            toast.success("Video ready! 🎉");
            // Brief moment to see the confetti before navigation
            setTimeout(() => router.push(`/projects/${data.projectId}/edit`), 800);
            return;
          } else if (event === "error") {
            throw new Error(data.message || "Generation failed");
          }
        }
      }
    } catch (err) {
      setGenerating(false);
      setCurrentGenStep(0);
      setGenPercent(0);
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (generating) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8">
        <Confetti trigger={confettiTrigger || null} count={80} />
        <div className="w-full max-w-md text-center">
          <div className="mb-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gold-500/15 animate-glow-pulse">
              <Zap className="h-10 w-10 text-gold-500" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              Building your video...
            </h2>
            <p className="mt-1 text-sm text-subtle">
              AI is working on it. Usually takes 20–40 seconds.
            </p>
          </div>

          <div className="space-y-3">
            {GENERATION_STEPS.map((s, i) => {
              const isDone = i < currentGenStep;
              const isCurrent = i === currentGenStep;
              return (
                <div
                  key={s.key}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-sm transition-all duration-500",
                    isDone && "border-green-500/20 bg-green-500/5 text-green-400",
                    isCurrent && "border-gold-500/30 bg-gold-500/10 text-gold-400",
                    !isDone && !isCurrent && "border-border bg-surface text-muted"
                  )}
                >
                  <span className="text-lg">{s.icon}</span>
                  <span className="flex-1 text-left font-medium">{s.label}</span>
                  {isDone && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                  {isCurrent && (
                    <div className="h-4 w-4 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{GENERATION_STEPS[Math.min(currentGenStep, GENERATION_STEPS.length - 1)]?.label}</span>
              <span className="font-semibold text-gold-500">{Math.round(displayPercent)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-overlay overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-gradient-gold"
                style={{ width: `${displayPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => (step === 1 ? router.push("/dashboard") : setStep((step - 1) as Step))}
            className="mb-4 flex items-center gap-1.5 text-sm text-subtle hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? "Back to dashboard" : "Back"}
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Create a new video</h1>
              <p className="mt-1 text-sm text-subtle">Step {step} of 2</p>
            </div>
            {/* Progress dots */}
            <div className="flex gap-2">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    s <= step ? "w-6 bg-gold-500" : "w-2 bg-overlay"
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Step 1 — Input */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Template banner */}
            {fromTemplate && (
              <div className="rounded-xl border border-gold-500/30 bg-gold-500/5 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-gold-500 flex-shrink-0" />
                  <p className="text-xs text-gold-400 font-medium">Template pre-filled — edit the topic or go straight to Continue</p>
                </div>
                <button onClick={() => setTopic("")} className="text-[10px] text-muted hover:text-white underline">
                  Clear
                </button>
              </div>
            )}

            {/* Input mode selector */}
            <div>
              <label className="mb-3 block text-sm font-medium text-subtle">
                How do you want to start?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {INPUT_MODES.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setInputMode(mode.id as InputMode)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                        inputMode === mode.id
                          ? "border-gold-500/50 bg-gold-500/10 text-white"
                          : "border-border bg-surface text-subtle hover:border-border-strong hover:text-white"
                      )}
                    >
                      <Icon className={cn("h-5 w-5 flex-shrink-0", inputMode === mode.id ? "text-gold-500" : "")} />
                      <div>
                        <p className="font-medium text-sm">{mode.label}</p>
                        <p className="text-xs text-muted mt-0.5">{mode.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Text input */}
            <div>
              <label className="mb-2 block text-sm font-medium text-subtle">
                {inputMode === "topic" && "What's your video about?"}
                {inputMode === "script" && "Paste your script"}
                {inputMode === "url" && "Paste a URL"}
                {inputMode === "upload" && "Describe what you want to make"}
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={
                  inputMode === "topic"
                    ? "e.g. 5 morning habits that changed my life, 3 things successful founders do daily, how to build a personal brand in 2025..."
                    : inputMode === "script"
                    ? "Paste your full script here..."
                    : inputMode === "url"
                    ? "https://example.com/blog/post — we'll read the article and create a video from it"
                    : "Describe what you want the video to be about..."
                }
                rows={5}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-white placeholder:text-muted focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/30 transition-all resize-none"
              />
              {topic.length > 0 && (
                <p className={cn(
                  "mt-1.5 text-xs flex items-center justify-between",
                  topic.length > 800 ? "text-ember-500" : topic.length > 30 ? "text-green-400" : "text-muted"
                )}>
                  <span>
                    {topic.length < 30 && "Tip: add a bit more context for a better script"}
                    {topic.length >= 30 && topic.length <= 800 && "Looks good"}
                    {topic.length > 800 && "Getting long — keep it under 800 chars for best results"}
                  </span>
                  <span className="text-muted">{topic.length} / 1000</span>
                </p>
              )}
            </div>

            {/* Tone selector */}
            <div>
              <label className="mb-3 block text-sm font-medium text-subtle">Tone & style</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                      tone === t.value
                        ? "border-gold-500/50 bg-gold-500/15 text-gold-500"
                        : "border-border text-subtle hover:border-border-strong hover:text-white"
                    )}
                  >
                    <span>{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {inputMode === "upload" ? (
              <Button
                className="w-full"
                size="lg"
                onClick={() => router.push("/projects/caption")}
              >
                <Captions className="h-4 w-4" />
                Go to caption upload
              </Button>
            ) : (
              <Button
                className="w-full"
                size="lg"
                loading={urlFetching}
                onClick={async () => {
                  if (!topic.trim()) { toast.error("Please enter a topic first"); return; }
                  if (inputMode === "url") {
                    const ok = await fetchUrlContent();
                    if (!ok) return;
                  }
                  setStep(2);
                }}
              >
                {inputMode === "url" && !urlFetching ? "Fetch & Continue" : "Continue"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Step 2 — Settings */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Duration */}
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-medium text-subtle">
                <Clock className="h-4 w-4" /> Video duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={cn(
                      "relative rounded-xl border p-3 text-center transition-all",
                      duration === d.value
                        ? "border-gold-500/50 bg-gold-500/10"
                        : "border-border bg-surface hover:border-border-strong"
                    )}
                  >
                    {d.badge === "Popular" && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-gold-500 px-2 text-[9px] font-bold text-black">
                        Popular
                      </span>
                    )}
                    <p className={cn("font-semibold text-sm", duration === d.value ? "text-gold-500" : "text-white")}>
                      {d.label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{d.badge !== "Popular" ? d.badge : ""}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect ratio */}
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-medium text-subtle">
                <Ratio className="h-4 w-4" /> Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                {ASPECT_RATIOS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setAspectRatio(r.value)}
                    className={cn(
                      "rounded-xl border p-4 text-center transition-all",
                      aspectRatio === r.value
                        ? "border-gold-500/50 bg-gold-500/10"
                        : "border-border bg-surface hover:border-border-strong"
                    )}
                  >
                    <div className={cn("mx-auto mb-2 flex items-center justify-center text-2xl",
                      aspectRatio === r.value ? "text-gold-500" : "text-subtle")}>
                      {r.icon}
                    </div>
                    <p className={cn("font-semibold text-sm", aspectRatio === r.value ? "text-gold-500" : "text-white")}>
                      {r.label}
                    </p>
                    <p className="text-xs text-muted">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-medium text-subtle">
                <Globe className="h-4 w-4" /> Script language
              </label>
              <div className="grid grid-cols-5 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => setLanguage(lang.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-all",
                      language === lang.value
                        ? "border-gold-500/50 bg-gold-500/10"
                        : "border-border bg-surface hover:border-border-strong"
                    )}
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span className={cn("text-[10px] font-medium leading-tight", language === lang.value ? "text-gold-500" : "text-subtle")}>
                      {lang.label}
                    </span>
                  </button>
                ))}
              </div>
              {language !== "English" && (
                <p className="mt-2 text-xs text-muted flex items-center gap-1.5">
                  <span className="text-gold-500">✓</span>
                  Script, voiceover & captions will be in {language} — powered by ElevenLabs multilingual model
                </p>
              )}
            </div>

            {/* Voice */}
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-medium text-subtle">
                <Mic2 className="h-4 w-4" /> Voice
                <span className="ml-auto text-[10px] text-muted font-normal">Click ▶ to preview</span>
              </label>

              {/* Your cloned voices */}
              {clonedVoices.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gold-500 mb-1.5">
                    Your Cloned Voices ({clonedVoices.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                    {clonedVoices.map((v) => (
                      <button
                        key={v.voice_id}
                        onClick={() => setVoiceId(v.voice_id)}
                        className={cn(
                          "flex items-center gap-2 rounded-xl border p-2 text-left transition-all",
                          voiceId === v.voice_id
                            ? "border-gold-500/50 bg-gold-500/10"
                            : "border-gold-500/20 bg-gold-500/5 hover:border-gold-500/40"
                        )}
                      >
                        <div className={cn("flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          voiceId === v.voice_id ? "bg-gold-500 text-black" : "bg-gold-500/20 text-gold-500")}>
                          {v.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn("text-xs font-medium truncate", voiceId === v.voice_id ? "text-gold-500" : "text-white")}>
                            ✨ {v.name}
                          </p>
                          <p className="text-[10px] text-muted truncate">
                            {v.accent || "Cloned"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {clonedVoices.length > 0 && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
                  Featured Voices
                </p>
              )}
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {FEATURED_VOICES.map((v) => (
                  <button
                    key={v.voice_id}
                    onClick={() => setVoiceId(v.voice_id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                      voiceId === v.voice_id
                        ? "border-gold-500/50 bg-gold-500/10"
                        : "border-border bg-surface hover:border-border-strong"
                    )}
                  >
                    <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      voiceId === v.voice_id ? "bg-gold-500 text-black" : "bg-elevated text-subtle")}>
                      {v.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", voiceId === v.voice_id ? "text-gold-500" : "text-white")}>
                        {v.name}
                      </p>
                      <p className="text-xs text-muted truncate">{v.style}</p>
                    </div>
                    {/* Preview button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); previewVoice(v.voice_id); }}
                      className={cn(
                        "flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full transition-all",
                        previewingVoice === v.voice_id
                          ? "bg-gold-500/20 text-gold-500"
                          : "text-muted hover:text-white hover:bg-elevated"
                      )}
                      title="Preview voice"
                    >
                      {previewingVoice === v.voice_id
                        ? <Square className="h-2.5 w-2.5 fill-current" />
                        : <Play className="h-2.5 w-2.5 fill-current" />
                      }
                    </button>
                  </button>
                ))}
              </div>
            </div>

            {/* Music mood */}
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-medium text-subtle">
                <Music2 className="h-4 w-4" /> Background music
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MUSIC_MOODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMusicMood(m.id)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border p-3 text-left text-sm transition-all",
                      musicMood === m.id
                        ? "border-gold-500/50 bg-gold-500/10 text-gold-400"
                        : "border-border bg-surface text-subtle hover:border-border-strong hover:text-white"
                    )}
                  >
                    <span>{m.emoji}</span>
                    <span className="font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary card */}
            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Your video</p>
              <p className="text-sm text-white font-medium mb-3 line-clamp-2">&ldquo;{topic}&rdquo;</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: "⏱", text: `${duration} seconds` },
                  { icon: "📐", text: aspectRatio },
                  { icon: "🗣️", text: language },
                  { icon: "🎙️", text: FEATURED_VOICES.find(v => v.voice_id === voiceId)?.name },
                  { icon: "🎵", text: MUSIC_MOODS.find(m => m.id === musicMood)?.label },
                ].map((item) => (
                  <Badge key={item.text} variant="secondary" className="gap-1 text-xs">
                    {item.icon} {item.text}
                  </Badge>
                ))}
              </div>
            </div>

            {creditsRemaining === 0 ? (
              <div className="rounded-xl border border-ember-500/30 bg-ember-500/5 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-ember-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">No credits remaining</p>
                  <p className="text-xs text-subtle mt-0.5">You&apos;ve used all your AI credits for this month.</p>
                  <Link href="/settings" className="mt-2 inline-flex text-xs text-gold-500 hover:underline font-medium">
                    View plan & upgrade →
                  </Link>
                </div>
              </div>
            ) : (
              <Button className="w-full" size="lg" onClick={handleGenerate}>
                <Zap className="h-4 w-4" />
                Generate video
                {creditsRemaining !== null && (
                  <span className="ml-auto text-[10px] opacity-60">{creditsRemaining} credit{creditsRemaining !== 1 ? "s" : ""} left</span>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
      </div>
    }>
      <NewProjectContent />
    </Suspense>
  );
}
