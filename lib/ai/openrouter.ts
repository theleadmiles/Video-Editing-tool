/**
 * OpenRouter client — drop-in for all LLM text calls.
 *
 * OpenRouter is OpenAI-API-compatible, so we reuse the `openai` SDK
 * with a custom baseURL. No extra package needed.
 *
 * Set in .env.local:
 *   OPENROUTER_API_KEY=sk-or-...
 *   OPENROUTER_MODEL=anthropic/claude-3.5-sonnet:beta   ← optional, this is the default
 *
 * Popular models available on OpenRouter:
 *   anthropic/claude-3.5-sonnet:beta     — fast, smart, great for scripts
 *   anthropic/claude-3.5-haiku:beta      — cheaper, still very capable
 *   anthropic/claude-3-opus              — most powerful Claude 3
 *   openai/gpt-4o                        — OpenAI flagship
 *   openai/gpt-4o-mini                   — fast + cheap OpenAI
 *   google/gemini-pro-1.5                — Google Gemini
 *   mistralai/mistral-large              — Mistral
 *
 * NOTE: Whisper (audio transcription) is NOT available on OpenRouter.
 *       Keep using the OpenAI SDK directly for lib/ai/whisper.ts only.
 */

import OpenAI from "openai";

export const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    // OpenRouter uses these for ranking / analytics — optional but recommended
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://boltcut.app",
    "X-Title": "Boltcut",
  },
});

/**
 * The model to use for all LLM calls.
 * Override via OPENROUTER_MODEL env var without touching code.
 */
export const OR_MODEL =
  process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet:beta";
