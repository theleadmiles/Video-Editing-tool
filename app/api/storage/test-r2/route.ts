import { NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * GET /api/storage/test-r2
 * Quick diagnostic — checks R2 env vars and tries a real write to the bucket.
 * REMOVE THIS ROUTE before going public / after debugging is done.
 */
export async function GET() {
  const accountId  = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKey  = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretKey  = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  const publicUrl  = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  const envCheck = {
    CLOUDFLARE_ACCOUNT_ID:           accountId  ? `✓ set (${accountId.slice(0,6)}…)`  : "✗ MISSING",
    CLOUDFLARE_R2_ACCESS_KEY_ID:     accessKey  ? `✓ set (${accessKey.slice(0,6)}…)`  : "✗ MISSING",
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: secretKey  ? `✓ set (${secretKey.slice(0,6)}…)`  : "✗ MISSING",
    CLOUDFLARE_R2_BUCKET_NAME:       bucketName ? `✓ set (${bucketName})`             : "✗ MISSING",
    NEXT_PUBLIC_R2_PUBLIC_URL:       publicUrl  ? `✓ set (${publicUrl})`              : "✗ MISSING",
  };

  if (!accountId || !accessKey || !secretKey || !bucketName) {
    return NextResponse.json({ status: "error", envCheck, message: "Missing env vars" });
  }

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  });

  // Test 1: List objects in the specific bucket
  try {
    await client.send(new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 }));
  } catch (err) {
    return NextResponse.json({
      status: "error", envCheck,
      test: "ListObjects failed",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Test 2: Write + delete a tiny test object
  const testKey = `_test/connection-check-${Date.now()}.txt`;
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucketName, Key: testKey,
      Body: "ok", ContentType: "text/plain",
    }));
    await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: testKey }));
  } catch (err) {
    return NextResponse.json({
      status: "error", envCheck,
      test: "PutObject failed",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return NextResponse.json({ status: "ok", envCheck, message: "R2 is fully working! Uploads will succeed." });
}
