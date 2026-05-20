/**
 * Browser-side WebM → MP4 transcoding via ffmpeg.wasm.
 *
 * MP4 (H.264 + AAC) plays natively on iPhones, Android, web, and all editors.
 * WebM (VP9 + Opus) is faster to encode but doesn't play on iOS Safari.
 *
 * Loaded lazily — ffmpeg.wasm is ~30MB and only needed when user picks MP4.
 */

import type { FFmpeg } from "@ffmpeg/ffmpeg";

let cachedFfmpeg: FFmpeg | null = null;

const FFMPEG_BASE_URL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

/**
 * Load ffmpeg.wasm once (cached for subsequent exports).
 */
export async function loadFfmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (cachedFfmpeg && cachedFfmpeg.loaded) return cachedFfmpeg;

  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { toBlobURL } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();

  if (onLog) {
    ffmpeg.on("log", ({ message }) => onLog(message));
  }

  await ffmpeg.load({
    coreURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  cachedFfmpeg = ffmpeg;
  return ffmpeg;
}

/**
 * Transcode a WebM blob to MP4 (H.264 + AAC).
 *
 * @param webmBlob   Source WebM from MediaRecorder
 * @param onProgress 0..1 progress callback (transcode progress)
 * @param onLog      Optional ffmpeg log line callback
 * @returns          MP4 Blob ready to download
 */
export async function transcodeWebmToMp4(
  webmBlob: Blob,
  onProgress?: (ratio: number) => void,
  onLog?: (msg: string) => void
): Promise<Blob> {
  const ffmpeg = await loadFfmpeg(onLog);
  const { fetchFile } = await import("@ffmpeg/util");

  // Hook progress
  if (onProgress) {
    const handler = (e: { progress: number }) => onProgress(e.progress);
    ffmpeg.on("progress", handler);
  }

  // Write input
  await ffmpeg.writeFile("input.webm", await fetchFile(webmBlob));

  // Transcode to MP4 with H.264 + AAC
  // -preset ultrafast keeps encode time bearable in-browser
  // -crf 23 = good visual quality / size tradeoff
  // -pix_fmt yuv420p ensures universal player compat (iOS especially)
  // -movflags +faststart puts metadata at the front for streaming/quick start
  await ffmpeg.exec([
    "-i", "input.webm",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    "output.mp4",
  ]);

  // Read output
  const data = await ffmpeg.readFile("output.mp4");
  // data is Uint8Array
  const arr = data as Uint8Array;
  const buf = new ArrayBuffer(arr.byteLength);
  new Uint8Array(buf).set(arr);
  const mp4Blob = new Blob([buf], { type: "video/mp4" });

  // Cleanup virtual filesystem
  try {
    await ffmpeg.deleteFile("input.webm");
    await ffmpeg.deleteFile("output.mp4");
  } catch { /* ignore */ }

  return mp4Blob;
}
