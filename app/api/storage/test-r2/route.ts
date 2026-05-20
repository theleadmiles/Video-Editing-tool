import { NextResponse } from "next/server";
import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";

/**
 * GET /api/storage/test-r2
 * Quick diagnostic — checks R2 env vars and tries to list buckets.
 * REMOVE THIS ROUTE before going public / after debugging is done.
 */
export async function GET() {
  const accountId  = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKey  = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretKey  = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const publicUrl  = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  const envCheck = {
    CLOUDFLARE_ACCOUNT_ID:          accountId  ? `✓ set (${accountId.slice(0,6)}…)`  : "✗ MISSING",
    CLOUDFLARE_R2_ACCESS_KEY_ID:    accessKey  ? `✓ set (${accessKey.slice(0,6)}…)`  : "✗ MISSING",
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: secretKey ? `✓ set (${secretKey.slice(0,6)}…)`  : "✗ MISSING",
    CLOUDFLARE_R2_BUCKET_NAME:      bucketName ? `✓ set (${bucketName})`             : "✗ MISSING",
    NEXT_PUBLIC_R2_PUBLIC_URL:      publicUrl  ? `✓ set (${publicUrl})`              : "✗ MISSING",
  };

  if (!accountId || !accessKey || !secretKey) {
    return NextResponse.json({ status: "error", envCheck, message: "Missing env vars" });
  }

  try {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });
    const result = await client.send(new ListBucketsCommand({}));
    const buckets = result.Buckets?.map(b => b.Name) ?? [];
    return NextResponse.json({
      status: "ok",
      envCheck,
      buckets,
      targetBucket: bucketName,
      bucketFound: buckets.includes(bucketName ?? ""),
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      envCheck,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
