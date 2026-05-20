import { toFile } from "openai";
import { openrouter } from "./openrouter";

export interface Caption {
  text: string;
  start: number;
  end: number;
}

export async function generateCaptions(audioBuffer: Buffer): Promise<Caption[]> {
  const file = await toFile(audioBuffer, "voiceover.mp3", { type: "audio/mpeg" });

  const transcription = await openrouter.audio.transcriptions.create({
    file,
    model: "openai/whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word"],
  });

  const words = (transcription as { words?: { word: string; start: number; end: number }[] }).words || [];

  if (!words.length) {
    return [{ text: transcription.text, start: 0, end: 5 }];
  }

  const captions: Caption[] = [];
  const chunkSize = 5;

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize);
    captions.push({
      text: chunk.map((w) => w.word).join(" ").trim(),
      start: chunk[0].start,
      end: chunk[chunk.length - 1].end,
    });
  }

  return captions;
}
