"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Plus, Sparkles, Search } from "lucide-react";

type Category =
  | "All"
  | "Reels"
  | "Business"
  | "Education"
  | "Lifestyle"
  | "Motivation"
  | "Festive"
  | "Tech"
  | "Finance";

const TEMPLATE_CATEGORIES: Category[] = [
  "All", "Reels", "Business", "Education", "Lifestyle", "Motivation", "Festive", "Tech", "Finance",
];

interface Template {
  id: number;
  name: string;
  category: Category;
  duration: number;
  aspect: "9:16" | "16:9" | "1:1";
  color: string;
  topic: string;
  tone: string;
  desc: string;
  emoji: string;
  language?: string;
}

const TEMPLATES: Template[] = [
  // ── Reels ──
  { id: 1, name: "Morning Routine", category: "Reels", duration: 45, aspect: "9:16",
    color: "from-gold-500/20 to-ember-500/20", emoji: "🌅", tone: "energetic",
    topic: "5 morning habits that changed my life and made me more productive",
    desc: "High-energy hook + 5 quick tips" },
  { id: 2, name: "Cricket Hype", category: "Reels", duration: 15, aspect: "9:16",
    color: "from-blue-500/20 to-green-500/20", emoji: "🏏", tone: "energetic",
    topic: "Why cricket is more than a sport in India — it unites a billion people",
    desc: "Sports hype reel for cricket fans" },
  { id: 3, name: "Day in My Life", category: "Reels", duration: 60, aspect: "9:16",
    color: "from-pink-500/20 to-purple-500/20", emoji: "📸", tone: "casual",
    topic: "A typical day in my life as a creator — morning to night routine breakdown",
    desc: "Lifestyle vlog format, relatable" },
  { id: 4, name: "Behind the Scenes", category: "Reels", duration: 30, aspect: "9:16",
    color: "from-indigo-500/20 to-blue-500/20", emoji: "🎬", tone: "casual",
    topic: "Behind the scenes of how I create content — the chaos, the planning, the magic",
    desc: "Authentic peek into your process" },

  // ── Festive ──
  { id: 5, name: "Diwali Wishes", category: "Festive", duration: 15, aspect: "9:16",
    color: "from-ember-500/20 to-pink-500/20", emoji: "🪔", tone: "emotional",
    topic: "Wishing everyone a joyful and prosperous Diwali — may this festival of lights bring happiness",
    desc: "Warm festival greeting reel" },
  { id: 6, name: "Holi Vibes", category: "Festive", duration: 15, aspect: "9:16",
    color: "from-pink-500/20 to-yellow-500/20", emoji: "🌈", tone: "energetic",
    topic: "Celebrating Holi — the festival of colors that brings everyone together in joy",
    desc: "Colorful Holi celebration energy" },
  { id: 7, name: "Independence Day", category: "Festive", duration: 30, aspect: "9:16",
    color: "from-orange-500/20 to-green-500/20", emoji: "🇮🇳", tone: "emotional",
    topic: "Celebrating India's independence — the freedom, the journey, and the future we are building",
    desc: "Patriotic, moving, shareable" },
  { id: 8, name: "Eid Mubarak", category: "Festive", duration: 15, aspect: "9:16",
    color: "from-emerald-500/20 to-teal-500/20", emoji: "🌙", tone: "emotional",
    topic: "Eid Mubarak — celebrating community, gratitude, and the joy of togetherness",
    desc: "Warm Eid greetings reel" },

  // ── Business ──
  { id: 9, name: "Product Launch", category: "Business", duration: 30, aspect: "9:16",
    color: "from-blue-500/20 to-purple-500/20", emoji: "🚀", tone: "professional",
    topic: "Introducing a new product that solves a big problem — what it is, why it matters, how to get it",
    desc: "Problem → solution → CTA" },
  { id: 10, name: "Brand Intro", category: "Business", duration: 30, aspect: "1:1",
    color: "from-gold-500/20 to-yellow-500/20", emoji: "✨", tone: "cinematic",
    topic: "Introducing our brand — who we are, what we stand for, and why we exist",
    desc: "Cinematic brand story in 30s" },
  { id: 11, name: "Customer Story", category: "Business", duration: 60, aspect: "16:9",
    color: "from-indigo-500/20 to-blue-500/20", emoji: "💬", tone: "professional",
    topic: "A customer success story showing how a product completely transformed their business",
    desc: "Before / after narrative arc" },
  { id: 12, name: "Startup Story", category: "Business", duration: 45, aspect: "9:16",
    color: "from-purple-500/20 to-indigo-500/20", emoji: "💡", tone: "energetic",
    topic: "How I built a startup from zero with no funding — the journey, failures, and what finally worked",
    desc: "Raw founder journey" },
  { id: 13, name: "Hiring Reel", category: "Business", duration: 30, aspect: "9:16",
    color: "from-cyan-500/20 to-blue-500/20", emoji: "👋", tone: "professional",
    topic: "We're hiring — here's why you should join our team, the mission, and what makes us different",
    desc: "Recruiting reel for top talent" },
  { id: 14, name: "Pitch Deck Hook", category: "Business", duration: 60, aspect: "16:9",
    color: "from-violet-500/20 to-fuchsia-500/20", emoji: "🎯", tone: "professional",
    topic: "Our 60-second pitch — the problem, our solution, the market, and why now",
    desc: "Investor-ready elevator pitch" },

  // ── Education ──
  { id: 15, name: "5 Tips Format", category: "Education", duration: 60, aspect: "9:16",
    color: "from-green-500/20 to-teal-500/20", emoji: "📝", tone: "educational",
    topic: "5 tips every beginner needs to know to get started faster and avoid common mistakes",
    desc: "Numbered tips, clear takeaways" },
  { id: 16, name: "Study Hack", category: "Education", duration: 30, aspect: "9:16",
    color: "from-cyan-500/20 to-blue-500/20", emoji: "🎓", tone: "educational",
    topic: "3 study techniques that top IIT and IIM students use to remember more and score higher",
    desc: "Viral study tips for exams" },
  { id: 17, name: "Mythbuster", category: "Education", duration: 45, aspect: "9:16",
    color: "from-red-500/20 to-orange-500/20", emoji: "💥", tone: "energetic",
    topic: "5 common myths people believe but are completely wrong — busted with facts and evidence",
    desc: "Engaging fact-check format" },
  { id: 18, name: "How It Works", category: "Education", duration: 60, aspect: "9:16",
    color: "from-teal-500/20 to-emerald-500/20", emoji: "⚙️", tone: "educational",
    topic: "How this everyday thing actually works — the surprising science behind it explained simply",
    desc: "Simplified science explainer" },

  // ── Finance ──
  { id: 19, name: "Financial Freedom", category: "Finance", duration: 45, aspect: "9:16",
    color: "from-green-500/20 to-emerald-500/20", emoji: "💰", tone: "educational",
    topic: "5 money habits every Indian in their 20s should start today to build wealth",
    desc: "Personal finance basics" },
  { id: 20, name: "SIP Explained", category: "Finance", duration: 60, aspect: "9:16",
    color: "from-emerald-500/20 to-teal-500/20", emoji: "📈", tone: "educational",
    topic: "What is a SIP and why every Indian should start one before turning 25",
    desc: "Mutual fund basics for beginners" },
  { id: 21, name: "Stock Market Tips", category: "Finance", duration: 45, aspect: "9:16",
    color: "from-blue-500/20 to-cyan-500/20", emoji: "📊", tone: "educational",
    topic: "5 stock market lessons every beginner investor learns the hard way — avoid them",
    desc: "Beginner investor mistakes" },

  // ── Lifestyle ──
  { id: 22, name: "Quick Recipe", category: "Lifestyle", duration: 30, aspect: "9:16",
    color: "from-orange-500/20 to-yellow-500/20", emoji: "🍛", tone: "casual",
    topic: "A quick and easy Indian recipe that takes under 15 minutes — perfect for busy days",
    desc: "Fast recipe walkthrough" },
  { id: 23, name: "Travel Destination", category: "Lifestyle", duration: 45, aspect: "9:16",
    color: "from-sky-500/20 to-blue-500/20", emoji: "✈️", tone: "cinematic",
    topic: "Why you must visit this hidden gem in India before it becomes too crowded",
    desc: "Wanderlust travel content" },
  { id: 24, name: "Fitness Challenge", category: "Lifestyle", duration: 30, aspect: "9:16",
    color: "from-red-500/20 to-ember-500/20", emoji: "💪", tone: "energetic",
    topic: "A 7-day fitness challenge that helped me lose weight and build strength without a gym",
    desc: "Fitness motivation reel" },
  { id: 25, name: "Skincare Routine", category: "Lifestyle", duration: 45, aspect: "9:16",
    color: "from-pink-500/20 to-rose-500/20", emoji: "🧴", tone: "casual",
    topic: "My 5-step skincare routine that fixed my acne and brightened my skin in 30 days",
    desc: "Glow-up routine breakdown" },

  // ── Motivation ──
  { id: 26, name: "Motivational Quote", category: "Motivation", duration: 15, aspect: "9:16",
    color: "from-ember-500/20 to-orange-500/20", emoji: "🔥", tone: "emotional",
    topic: "An inspiring message about not giving up — every setback is a setup for a comeback",
    desc: "Short, punchy, shareable" },
  { id: 27, name: "Mindset Shift", category: "Motivation", duration: 45, aspect: "9:16",
    color: "from-purple-500/20 to-pink-500/20", emoji: "🧠", tone: "emotional",
    topic: "One mindset shift that completely changed my life — and how you can adopt it today",
    desc: "Personal transformation story" },
  { id: 28, name: "Career Growth", category: "Motivation", duration: 60, aspect: "9:16",
    color: "from-teal-500/20 to-cyan-500/20", emoji: "📈", tone: "professional",
    topic: "5 career mistakes most people make in their 20s and how to avoid them",
    desc: "Career advice for professionals" },

  // ── Tech ──
  { id: 29, name: "AI Tool Review", category: "Tech", duration: 45, aspect: "9:16",
    color: "from-violet-500/20 to-indigo-500/20", emoji: "🤖", tone: "educational",
    topic: "This AI tool just changed how I work — here's what it does and why it's worth it",
    desc: "Honest AI tool review" },
  { id: 30, name: "Tech Hack", category: "Tech", duration: 30, aspect: "9:16",
    color: "from-blue-500/20 to-cyan-500/20", emoji: "💻", tone: "casual",
    topic: "3 phone settings most people don't know about that save hours every week",
    desc: "Tech tips that go viral" },
  { id: 31, name: "App Recommendation", category: "Tech", duration: 30, aspect: "9:16",
    color: "from-indigo-500/20 to-purple-500/20", emoji: "📱", tone: "casual",
    topic: "5 underrated apps that will make your daily life 10x easier and more productive",
    desc: "App recommendation reel" },
];

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return TEMPLATES.filter((t) => {
      const matchesCat = activeCategory === "All" || t.category === activeCategory;
      const matchesSearch = !search.trim()
        || t.name.toLowerCase().includes(search.toLowerCase())
        || t.desc.toLowerCase().includes(search.toLowerCase())
        || t.topic.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, search]);

  const countByCategory = (cat: Category) =>
    cat === "All" ? TEMPLATES.length : TEMPLATES.filter((t) => t.category === cat).length;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Templates</h1>
          <p className="mt-1 text-sm text-subtle">
            {TEMPLATES.length} proven formats. Pick one, customise it, go live.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="h-4 w-4" />
            Blank project
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search templates"
          className="w-full rounded-xl border border-border bg-surface pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-muted focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 transition-all"
        />
      </div>

      {/* Category filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            aria-pressed={activeCategory === cat}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500",
              activeCategory === cat
                ? "border-gold-500/50 bg-gold-500/10 text-gold-500"
                : "border-border text-subtle hover:border-gold-500/30 hover:text-white"
            )}
          >
            {cat}
            <span className={cn(
              "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
              activeCategory === cat ? "bg-gold-500/20 text-gold-500" : "bg-elevated text-muted"
            )}>
              {countByCategory(cat)}
            </span>
          </button>
        ))}
      </div>

      {/* Templates grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-20 text-center">
          <Search className="mb-3 h-10 w-10 text-muted" aria-hidden="true" />
          <h3 className="font-semibold text-white">No templates match</h3>
          <p className="mt-1 text-sm text-subtle">Try a different search or category.</p>
          <button
            onClick={() => { setSearch(""); setActiveCategory("All"); }}
            className="mt-3 text-xs text-gold-500 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((t) => {
            const href = `/projects/new?topic=${encodeURIComponent(t.topic)}&tone=${t.tone}&duration=${t.duration}&aspectRatio=${encodeURIComponent(t.aspect)}`;
            return (
              <Link
                key={t.id}
                href={href}
                className="group rounded-2xl border border-border bg-surface overflow-hidden hover:border-gold-500/30 transition-all hover:-translate-y-0.5 shadow-card hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
              >
                {/* Thumbnail */}
                <div className={`h-32 bg-gradient-to-br ${t.color} flex items-center justify-center relative`}>
                  <span className="text-4xl group-hover:scale-110 transition-transform">{t.emoji}</span>
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-[9px]">{t.aspect}</Badge>
                  </div>
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="secondary" className="text-[9px]">{t.duration}s</Badge>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <h3 className="font-semibold text-white text-sm leading-snug">{t.name}</h3>
                    <Badge variant="secondary" className="text-[9px] flex-shrink-0 capitalize">{t.category}</Badge>
                  </div>
                  <p className="text-xs text-subtle leading-relaxed line-clamp-2">{t.desc}</p>
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-gold-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="h-3 w-3" />
                    Use template →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
