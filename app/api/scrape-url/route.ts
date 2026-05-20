import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

  try {
    new URL(url); // validate URL format
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Boltcut/1.0; +https://boltcut.ai)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Could not fetch URL (${res.status})` }, { status: 422 });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return NextResponse.json({ error: "URL does not point to a readable page" }, { status: 422 });
    }

    const html = await res.text();

    // Strip HTML tags and extract readable text
    const text = extractText(html);

    if (text.length < 100) {
      return NextResponse.json({ error: "Not enough text content found on this page" }, { status: 422 });
    }

    // Truncate to ~2000 chars for the prompt
    const truncated = text.slice(0, 2000).trim();

    return NextResponse.json({ text: truncated, url });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json({ error: "Request timed out — the page took too long to load" }, { status: 408 });
    }
    return NextResponse.json({ error: "Failed to fetch URL" }, { status: 500 });
  }
}

function extractText(html: string): string {
  // Remove script and style blocks
  let text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, " ");

  // Convert block elements to newlines
  text = text
    .replace(/<\/?(p|div|h[1-6]|li|br|tr|blockquote)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " "); // strip remaining tags

  // Decode HTML entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ");

  // Clean up whitespace
  text = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 20) // keep substantial lines only
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}
