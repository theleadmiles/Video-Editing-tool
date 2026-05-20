# Boltcut — Master Plan

> Living document. Updated every development session.

---

## What We're Building

An AI-native video creation SaaS for creators, marketing teams, and agencies in India.  
Users go from idea → published video in under 60 seconds.

**Tagline:** Edit at the speed of thought.

---

## Product Decisions (Locked)

| Decision | Choice |
|---|---|
| Primary market | India first, then global |
| Primary format | 9:16 (Reels) — all 3 formats from day 1 |
| Video length | 30–60 sec, mixed supported |
| Languages | English, Hindi, Indian regional (ElevenLabs) |
| Voiceover | ElevenLabs — all voices, cloning, expression styles |
| Music | Pixabay (free) — user picks by mood |
| B-roll | Pexels API (free) |
| Video generation | Phase 3+ (Hailuo / Runway) |
| Payments | Razorpay (India) |
| Auth | Supabase Auth (Google + email) |

---

## Tech Stack

| Layer | Tool | Tier |
|---|---|---|
| Frontend | Next.js 14 + Tailwind + shadcn/ui | Free |
| Backend / DB / Auth | Supabase | Free |
| Storage | Cloudflare R2 | 10GB free |
| Hosting | Vercel | Free |
| AI Script | Claude API (Anthropic) | Pay-per-use |
| Voiceover | ElevenLabs | 10k chars/mo free |
| Captions | OpenAI Whisper | Pay-per-use |
| Stock footage | Pexels API | Free |
| Music | Pixabay API | Free |
| Video render | Remotion | Free |
| Payments | Razorpay | Free until transactions |
| Email | Resend | 100/day free |
| Analytics | PostHog | 1M events/mo free |
| Error tracking | Sentry | 5k errors/mo free |

---

## Brand

```
Colors:
  Background:  #0A0A0A
  Gold:        #F0A500  (primary brand)
  Red:         #FF4D4D  (accent / energy)
  White:       #FFFFFF  (text)
  Surface:     #141414  (cards)
  Border:      #242424

Fonts:
  Display:     Geist Sans Bold
  Body:        Inter Regular
```

---

## MVP Feature Set

| # | Feature | Status |
|---|---|---|
| 1 | Prompt → full video pipeline | 🔴 Not started |
| 2 | Voiceover (ElevenLabs, all voices) | 🔴 Not started |
| 3 | Auto-captions (Whisper) | 🔴 Not started |
| 4 | Auto B-roll (Pexels) | 🔴 Not started |
| 5 | Background music + beat-sync | 🔴 Not started |
| 6 | Text overlays / titles | 🔴 Not started |
| 7 | Flipping (9:16 / 16:9 / 1:1) | 🔴 Not started |
| 8 | Export (MP4, 1080p) | 🔴 Not started |

---

## Development Phases

### ✅ Phase 0 — Setup & Foundation
**Status: IN PROGRESS**

- [x] Project folder structure created
- [x] package.json, tailwind, tsconfig, next.config
- [x] Supabase client (browser + server)
- [x] Auth middleware (route protection)
- [x] Auth callback route
- [x] All UI components (button, input, card, badge, label, separator, toast)
- [x] Logo component
- [x] Navbar (marketing)
- [x] App sidebar (with user menu + credits bar)
- [x] Footer
- [x] Landing page (full, polished — 7 sections)
- [x] Login page (Google + email)
- [x] Signup page (Google + email + split layout)
- [x] Dashboard page (stats + quick start + recent projects)
- [x] App layout (auth-protected shell)
- [x] Database migration SQL (8 tables + RLS)
- [ ] Install dependencies (`npm install`)
- [ ] Create `.env.local` with API keys
- [ ] Run database migration in Supabase
- [ ] Deploy to Vercel

---

### 🔴 Phase 1 — Core AI Pipeline
**Status: Not started**

- [ ] Claude API → script generation from topic/brief
- [ ] ElevenLabs → voiceover from script
- [ ] Pexels API → B-roll clips by keyword
- [ ] Whisper → timed caption JSON from audio
- [ ] Pixabay → music by mood
- [ ] Timeline JSON builder (assembles all assets)
- [ ] Supabase Realtime → live generation progress
- [ ] `/api/generate` route (orchestrates full pipeline)
- [ ] "New project" modal (input → trigger generation)
- [ ] Progress screen (live steps updating)

---

### 🔴 Phase 2 — Editor UI
**Status: Not started**

- [ ] Remotion player (video preview)
- [ ] Multi-track timeline (video, text, audio)
- [ ] Clip drag/trim/reorder
- [ ] Text overlay editor
- [ ] Audio controls
- [ ] Right panel (layer properties)
- [ ] AI assistant chat panel
- [ ] Undo / redo
- [ ] Autosave

---

### 🔴 Phase 3 — Flip + Export
**Status: Not started**

- [ ] Aspect ratio switcher
- [ ] Smart reframe per format
- [ ] One-click flip to all 3 formats
- [ ] Remotion server-side render
- [ ] Cloudflare R2 upload
- [ ] Signed download URL
- [ ] Thumbnail generation

---

### 🔴 Phase 4 — Templates + Brand Kit
**Status: Not started**

- [ ] 10 starter templates
- [ ] Templates library page
- [ ] Brand kit page
- [ ] Auto-apply brand to new projects
- [ ] Onboarding flow

---

### 🔴 Phase 5 — Beta Launch
**Status: Not started**

- [ ] PostHog analytics
- [ ] Sentry error tracking
- [ ] Resend email flows
- [ ] Landing page complete
- [ ] 5–10 beta users
- [ ] Bug fixes

---

### 🔴 Phase 6 — Monetization
**Status: Not started**

- [ ] Credits system
- [ ] Razorpay integration
- [ ] Pricing page live
- [ ] Plan upgrade/downgrade

---

## API Keys Needed

| Service | Purpose | Free? |
|---|---|---|
| Supabase URL + Anon Key | DB + Auth | ✅ |
| Anthropic (Claude) | Script writing | Pay-per-use |
| ElevenLabs | Voiceover | 10k chars free |
| OpenAI (Whisper) | Captions | Pay-per-use |
| Pexels | Stock footage | ✅ Free |
| Pixabay | Music | ✅ Free |
| Cloudflare R2 | Video storage | 10GB free |

---

## File Structure

```
boltcut/
├── app/
│   ├── (marketing)/page.tsx      ← Landing page
│   ├── (app)/
│   │   ├── layout.tsx            ← Auth-protected shell
│   │   ├── dashboard/page.tsx    ← Dashboard
│   │   └── projects/             ← Editor (Phase 2)
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts
│   ├── api/
│   │   ├── generate/             ← Core AI pipeline (Phase 1)
│   │   └── export/               ← Video render (Phase 3)
│   ├── layout.tsx                ← Root layout
│   └── globals.css
├── components/
│   ├── ui/                       ← button, input, card, badge...
│   ├── shared/                   ← navbar, footer, sidebar, logo
│   └── editor/                   ← Timeline, player (Phase 2)
├── lib/
│   ├── supabase/                 ← client.ts, server.ts
│   ├── ai/                       ← Claude, ElevenLabs, Whisper
│   └── utils.ts
├── types/index.ts
├── middleware.ts
├── supabase/migrations/001_initial_schema.sql
├── .env.example
├── .env.local                    ← YOUR API KEYS (never commit)
└── MASTER_PLAN.md                ← This file
```

---

*Last updated: Phase 0 complete (code written). Pending: npm install + deploy.*
