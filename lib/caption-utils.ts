import type { TimelineClip } from "@/types";

/**
 * Re-chunk captions at a new words-per-chunk target using existing word_timings.
 * If any clip lacks word_timings, returns clips unchanged (same reference).
 * Preserves style (color, font, animation etc.) from the first clip.
 */
export function rechunkCaptions(
  clips: TimelineClip[],
  wordsPerChunk: number
): TimelineClip[] {
  if (clips.length === 0) return clips;

  // Check all clips have word_timings
  const allHaveTimings = clips.every(
    (c) => c.word_timings && c.word_timings.length > 0
  );
  if (!allHaveTimings) return clips;

  // Flatten all word timings
  const allWords = clips.flatMap((c) => c.word_timings!);
  if (allWords.length === 0) return clips;

  // Use first clip as style template
  const styleClip = clips[0];

  const result: TimelineClip[] = [];
  for (let i = 0; i < allWords.length; i += wordsPerChunk) {
    const chunk = allWords.slice(i, i + wordsPerChunk);
    const text = chunk.map((w) => w.word).join(" ");
    const startTime = chunk[0].start;
    const endTime = chunk[chunk.length - 1].end;
    const duration = Math.max(0.1, endTime - startTime);

    result.push({
      // Style from first clip
      font_family: styleClip.font_family,
      font_size: styleClip.font_size,
      font_weight: styleClip.font_weight,
      color: styleClip.color,
      animation: styleClip.animation,
      position: styleClip.position,
      text_transform: styleClip.text_transform,
      letter_spacing: styleClip.letter_spacing,
      stroke_color: styleClip.stroke_color,
      stroke_width: styleClip.stroke_width,
      background_css: styleClip.background_css,
      bg_padding: styleClip.bg_padding,
      max_width_pct: styleClip.max_width_pct,
      word_pop_color: styleClip.word_pop_color,
      word_burst_size: styleClip.word_burst_size,
      gradient_from: styleClip.gradient_from,
      gradient_to: styleClip.gradient_to,
      gradient_angle: styleClip.gradient_angle,
      // New clip data
      id: crypto.randomUUID(),
      text,
      start_time: startTime,
      duration,
      word_timings: chunk,
    });
  }

  return result;
}

/**
 * Shift all clip start_times by deltaSeconds. Clamps to >= 0.
 */
export function shiftCaptions(
  clips: TimelineClip[],
  deltaSeconds: number
): TimelineClip[] {
  return clips.map((c) => ({
    ...c,
    start_time: Math.max(0, c.start_time + deltaSeconds),
  }));
}

/**
 * Merge clip[index] with clip[index+1] into one clip.
 * Combined text, combined word_timings, duration spans both.
 */
export function mergeCaptions(
  clips: TimelineClip[],
  index: number
): TimelineClip[] {
  if (index < 0 || index >= clips.length - 1) return clips;

  const a = clips[index];
  const b = clips[index + 1];

  const merged: TimelineClip = {
    ...a,
    id: crypto.randomUUID(),
    text: [a.text, b.text].filter(Boolean).join(" "),
    start_time: a.start_time,
    duration: (a.duration ?? 0) + (b.duration ?? 0),
    word_timings:
      a.word_timings && b.word_timings
        ? [...a.word_timings, ...b.word_timings]
        : a.word_timings || b.word_timings,
  };

  return [
    ...clips.slice(0, index),
    merged,
    ...clips.slice(index + 2),
  ];
}

/**
 * Split clip[index] at `splitAt` global seconds into two clips.
 * Words before splitAt go to first clip, words at/after go to second.
 * Falls back to text split at midpoint if no word_timings.
 */
export function splitCaption(
  clips: TimelineClip[],
  index: number,
  splitAt: number
): TimelineClip[] {
  if (index < 0 || index >= clips.length) return clips;

  const clip = clips[index];
  const clipEnd = clip.start_time + clip.duration;

  // splitAt must be within the clip
  if (splitAt <= clip.start_time || splitAt >= clipEnd) return clips;

  let firstClip: TimelineClip;
  let secondClip: TimelineClip;

  if (clip.word_timings && clip.word_timings.length > 0) {
    const before = clip.word_timings.filter((w) => w.start < splitAt);
    const after = clip.word_timings.filter((w) => w.start >= splitAt);

    if (before.length === 0 || after.length === 0) {
      // Can't split by words — fall through to text split
    } else {
      const firstText = before.map((w) => w.word).join(" ");
      const secondText = after.map((w) => w.word).join(" ");
      const firstEnd = before[before.length - 1].end;
      const secondStart = after[0].start;

      firstClip = {
        ...clip,
        id: crypto.randomUUID(),
        text: firstText,
        start_time: clip.start_time,
        duration: Math.max(0.1, firstEnd - clip.start_time),
        word_timings: before,
      };

      secondClip = {
        ...clip,
        id: crypto.randomUUID(),
        text: secondText,
        start_time: secondStart,
        duration: Math.max(0.1, clipEnd - secondStart),
        word_timings: after,
      };

      return [
        ...clips.slice(0, index),
        firstClip,
        secondClip,
        ...clips.slice(index + 1),
      ];
    }
  }

  // Fallback: split text at midpoint
  const words = String(clip.text || "").split(" ");
  const mid = Math.max(1, Math.floor(words.length / 2));
  const firstText = words.slice(0, mid).join(" ");
  const secondText = words.slice(mid).join(" ");
  const firstDuration = splitAt - clip.start_time;
  const secondDuration = clipEnd - splitAt;

  firstClip = {
    ...clip,
    id: crypto.randomUUID(),
    text: firstText,
    start_time: clip.start_time,
    duration: Math.max(0.1, firstDuration),
    word_timings: undefined,
  };

  secondClip = {
    ...clip,
    id: crypto.randomUUID(),
    text: secondText,
    start_time: splitAt,
    duration: Math.max(0.1, secondDuration),
    word_timings: undefined,
  };

  return [
    ...clips.slice(0, index),
    firstClip,
    secondClip,
    ...clips.slice(index + 1),
  ];
}
