import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * POST /api/storage/upload-url
 * Returns a presigned PUT URL so the browser can upload large video files
 * directly to Cloudflare R2 — no Vercel body limit, no Supabase 50 MB cap.
 *
 * Body: { filename: string, content_type: string }
 * Returns: { signed_url, public_url }
 */

function r2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", user.id)
    .single();
  if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { filename, content_type } = await req.json();
  if (!filename) return NextResponse.json({ error: "filename required" }, { status: 400 });

  const safe   = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const key    = `${workspace.id}/videos/${Date.now()}-${safe}`;
  const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

  try {
    const command   = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: content_type });
    const signedUrl = await getSignedUrl(r2Client(), command, { expiresIn: 3600 });
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`;

    return NextResponse.json({ signed_url: signedUrl, public_url: publicUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create upload URL" },
      { status: 500 }
    );
  }
}
