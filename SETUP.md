# Boltcut — First-Time Setup Guide

Do these steps ONCE. Takes about 30–45 minutes total.

---

## Step 1 — Install Tools on Your Mac (5 min)

### A. Install Node.js
1. Go to **nodejs.org**
2. Click the big green **LTS** button → download
3. Open the downloaded file → click through "Next" until installed

### B. Install Cursor
1. Go to **cursor.com** → Download → install like any Mac app
2. Open Cursor → sign in with GitHub when prompted

---

## Step 2 — Create Online Accounts (15 min)

| Service | URL | Notes |
|---|---|---|
| GitHub | github.com | Sign up → create repo named `boltcut` (Private) |
| Vercel | vercel.com | Sign up with GitHub |
| Supabase | supabase.com | Sign up with GitHub → New project → name: `boltcut`, region: Singapore |
| Cloudflare | cloudflare.com | Sign up → R2 → Create bucket: `boltcut-videos` |
| Anthropic | console.anthropic.com | Sign up → API Keys → Create key → Add $5 credits |
| ElevenLabs | elevenlabs.io | Sign up → Profile → API Keys → copy key |
| OpenAI | platform.openai.com | Sign up → API Keys → Create key → Add $5 credits |
| Pexels | pexels.com/api | Sign up → Your API Key → copy |
| Pixabay | pixabay.com/api/docs | Sign up → copy API key from docs page |

---

## Step 3 — Open Project in Cursor (2 min)

1. Open **Cursor**
2. Click **File → Open Folder**
3. Navigate to your **Downloads → boltcut** folder → click Open
4. You'll see the project files on the left

---

## Step 4 — Create Your Environment File (5 min)

1. In Cursor, find `.env.example` in the left sidebar
2. Right-click it → **Copy** → paste and rename to `.env.local`
3. Open `.env.local` and fill in every value with your actual API keys:

```
NEXT_PUBLIC_SUPABASE_URL=         ← From Supabase: Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    ← From Supabase: Settings → API → anon public key
SUPABASE_SERVICE_ROLE_KEY=        ← From Supabase: Settings → API → service_role key

ANTHROPIC_API_KEY=                ← From console.anthropic.com → API Keys
ELEVENLABS_API_KEY=               ← From elevenlabs.io → Profile → API Keys
OPENAI_API_KEY=                   ← From platform.openai.com → API Keys

PEXELS_API_KEY=                   ← From pexels.com/api
PIXABAY_API_KEY=                  ← From pixabay.com/api/docs

CLOUDFLARE_ACCOUNT_ID=            ← From Cloudflare dashboard → right side panel
CLOUDFLARE_R2_ACCESS_KEY_ID=      ← From Cloudflare R2 → Manage R2 API tokens
CLOUDFLARE_R2_SECRET_ACCESS_KEY=  ← Same as above
CLOUDFLARE_R2_BUCKET_NAME=boltcut-videos
NEXT_PUBLIC_R2_PUBLIC_URL=        ← From Cloudflare R2 → your bucket → Settings → Public URL

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Save the file (Cmd+S)

---

## Step 5 — Run Database Migration (5 min)

1. Go to **supabase.com** → open your `boltcut` project
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Open the file `supabase/migrations/001_initial_schema.sql` in Cursor
5. Select all text (Cmd+A) → Copy (Cmd+C)
6. Paste into the Supabase SQL Editor
7. Click **Run** (green button)
8. You should see "Success" — your database is set up

---

## Step 6 — Install Dependencies & Run (5 min)

1. In Cursor, press **Ctrl+`** (backtick) to open the terminal
2. Type these two commands one at a time, press Enter after each:

```bash
npm install
```
*(Wait ~2 minutes for it to download everything)*

```bash
npm run dev
```

3. Open your browser and go to: **http://localhost:3000**

You should see the Boltcut landing page — dark, with gold accents. 🎉

---

## Step 7 — Enable Google Auth in Supabase (5 min)

1. Go to Supabase → **Authentication → Providers → Google**
2. Toggle it **ON**
3. Go to **console.cloud.google.com** → APIs & Services → Credentials
4. Create OAuth 2.0 credentials, add callback URL:
   `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
5. Copy Client ID and Secret into Supabase → Save

---

## Step 8 — Deploy to Vercel (5 min)

1. Push your code to GitHub:
   - Open Cursor terminal
   - Run: `git init && git add . && git commit -m "Initial commit"`
   - Create repo on GitHub → copy the remote URL
   - Run: `git remote add origin YOUR_GITHUB_URL && git push -u origin main`

2. Go to **vercel.com** → **New Project** → Import your `boltcut` repo
3. Click **Environment Variables** → add ALL the values from your `.env.local`
4. Click **Deploy** → wait ~2 min

Your site is now live at `https://boltcut.vercel.app` 🚀

---

## When It's Live, Tell Me

Come back and say **"setup done"** and I'll immediately start Phase 1:
the full AI generation pipeline (script → voiceover → B-roll → captions → music).
