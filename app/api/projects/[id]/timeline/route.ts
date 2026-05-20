import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TimelineData, TimelineClip, TimelineTrack } from "@/types";

/**
 * Single endpoint for timeline mutations. Operations:
 *  - delete_clip { trackId, clipId }
 *  - reorder_clips { trackId, clipIds: string[] }   // new ordering
 *  - split_clip { trackId, clipId, at }              // at = global seconds
 *  - swap_clip { trackId, clipId, url, thumbnail? }
 *  - trim_clip { trackId, clipId, duration }
 *  - set_speed { trackId, clipId, speed }            // 0.5 / 1 / 1.5 / 2
 *  - set_volume { trackId, volume }                  // 0..1
 *  - replace_music { url, title? }
 *  - magic_cut                                       // sync video cuts to caption boundaries
 *  - set_full_timeline { timeline_data }             // replace wholesale
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const op = body.op as string;

  const { data: project } = await supabase
    .from("projects")
    .select("timeline_data, workspace_id")
    .eq("id", id)
    .single();
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const timeline = project.timeline_data as TimelineData | null;
  if (!timeline?.tracks) {
    return NextResponse.json({ error: "Project has no timeline" }, { status: 400 });
  }

  let updated: TimelineData;
  try {
    updated = applyOp(timeline, op, body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Operation failed" },
      { status: 400 }
    );
  }

  // Recompute video track total duration + propagate
  const videoTrack = updated.tracks.find((t) => t.type === "video");
  if (videoTrack) {
    let t = 0;
    for (const c of videoTrack.clips) {
      c.start_time = t;
      t += c.duration;
    }
    updated.duration = Math.max(t, updated.duration);
  }

  await supabase
    .from("projects")
    .update({ timeline_data: updated })
    .eq("id", id);

  return NextResponse.json({ ok: true, timeline_data: updated });
}

function applyOp(timeline: TimelineData, op: string, body: Record<string, unknown>): TimelineData {
  // Deep clone so we don't mutate the original
  const next: TimelineData = JSON.parse(JSON.stringify(timeline));

  function findTrack(trackId: string): TimelineTrack {
    const t = next.tracks.find((x) => x.id === trackId);
    if (!t) throw new Error(`Track not found: ${trackId}`);
    return t;
  }

  switch (op) {
    case "delete_clip": {
      const tr = findTrack(body.trackId as string);
      tr.clips = tr.clips.filter((c) => c.id !== body.clipId);
      return next;
    }

    case "reorder_clips": {
      const tr = findTrack(body.trackId as string);
      const order = body.clipIds as string[];
      const byId = new Map(tr.clips.map((c) => [c.id, c]));
      tr.clips = order.map((id) => {
        const c = byId.get(id);
        if (!c) throw new Error(`Clip not found in track: ${id}`);
        return c;
      });
      return next;
    }

    case "split_clip": {
      const tr = findTrack(body.trackId as string);
      const at = body.at as number;
      const idx = tr.clips.findIndex((c) => c.id === body.clipId);
      if (idx < 0) throw new Error("Clip not found");
      const clip = tr.clips[idx];
      const splitOffset = at - clip.start_time;
      if (splitOffset <= 0.1 || splitOffset >= clip.duration - 0.1) {
        throw new Error("Split point is at clip edge");
      }
      const left: TimelineClip = {
        ...clip,
        id: `${clip.id}_a_${Date.now()}`,
        duration: splitOffset,
      };
      const right: TimelineClip = {
        ...clip,
        id: `${clip.id}_b_${Date.now() + 1}`,
        start_time: clip.start_time + splitOffset,
        duration: clip.duration - splitOffset,
      };
      tr.clips.splice(idx, 1, left, right);
      return next;
    }

    case "swap_clip": {
      const tr = findTrack(body.trackId as string);
      const clip = tr.clips.find((c) => c.id === body.clipId);
      if (!clip) throw new Error("Clip not found");
      clip.url = body.url as string;
      if (body.thumbnail) clip.thumbnail = body.thumbnail as string;
      return next;
    }

    case "trim_clip": {
      const tr = findTrack(body.trackId as string);
      const clip = tr.clips.find((c) => c.id === body.clipId);
      if (!clip) throw new Error("Clip not found");
      const dur = Math.max(0.5, Math.min(60, body.duration as number));
      clip.duration = dur;
      return next;
    }

    case "set_speed": {
      const tr = findTrack(body.trackId as string);
      const clip = tr.clips.find((c) => c.id === body.clipId);
      if (!clip) throw new Error("Clip not found");
      const speed = body.speed as number;
      (clip as TimelineClip & { speed?: number }).speed = speed;
      return next;
    }

    case "set_volume": {
      const tr = findTrack(body.trackId as string);
      const vol = Math.max(0, Math.min(1, body.volume as number));
      for (const c of tr.clips) c.volume = vol;
      return next;
    }

    case "replace_music": {
      // Find or create music_track
      let tr = next.tracks.find((t) => t.id === "music_track");
      if (!tr) {
        tr = { id: "music_track", type: "audio", clips: [] };
        next.tracks.push(tr);
      }
      tr.clips = [{
        id: "music",
        url: body.url as string,
        start_time: 0,
        duration: next.duration,
        volume: 0.2,
      }];
      return next;
    }

    case "magic_cut": {
      // Re-sync video clip durations to caption boundaries
      const videoTrack = next.tracks.find((t) => t.type === "video");
      const captionTrack = next.tracks.find((t) => t.type === "text");
      if (!videoTrack || !captionTrack || captionTrack.clips.length === 0) {
        throw new Error("Need video + caption tracks");
      }

      // Group captions into chunks roughly matching the original video clip count
      const captions = captionTrack.clips.slice().sort((a, b) => a.start_time - b.start_time);
      const totalDur = next.duration;
      const targetCount = videoTrack.clips.length;

      // Calculate caption cluster boundaries by even time distribution
      const segmentDuration = totalDur / targetCount;
      const newClips: TimelineClip[] = [];
      let t = 0;
      for (let i = 0; i < targetCount; i++) {
        const original = videoTrack.clips[i] || videoTrack.clips[videoTrack.clips.length - 1];
        // Find nearest caption boundary to snap to
        const targetEnd = (i + 1) * segmentDuration;
        const nearestCaption = captions.find(
          (c) => Math.abs(c.start_time + c.duration - targetEnd) < segmentDuration / 2
        );
        const end = nearestCaption ? nearestCaption.start_time + nearestCaption.duration : targetEnd;
        const dur = Math.max(2, end - t);
        newClips.push({
          ...original,
          id: `clip_${Math.round(t * 1000)}`,
          start_time: t,
          duration: dur,
        });
        t += dur;
      }
      videoTrack.clips = newClips;
      return next;
    }

    case "duplicate_clip": {
      const tr = findTrack(body.trackId as string);
      const idx = tr.clips.findIndex((c) => c.id === body.clipId);
      if (idx < 0) throw new Error("Clip not found");
      const orig = tr.clips[idx];
      const copy: TimelineClip = {
        ...orig,
        id: `${orig.id}_dup_${Date.now()}`,
      };
      tr.clips.splice(idx + 1, 0, copy);
      return next;
    }

    case "insert_clip": {
      const tr = findTrack(body.trackId as string);
      const afterClipId = body.afterClipId as string | undefined;
      const newClip = body.clip as TimelineClip;
      if (!newClip || !newClip.url) throw new Error("Invalid clip");
      if (afterClipId) {
        const idx = tr.clips.findIndex((c) => c.id === afterClipId);
        tr.clips.splice(idx + 1, 0, newClip);
      } else {
        tr.clips.push(newClip);
      }
      return next;
    }

    case "update_captions": {
      const tr = next.tracks.find((t) => t.type === "text");
      if (!tr) throw new Error("Caption track missing");
      tr.clips = body.captions as TimelineClip[];
      return next;
    }

    case "set_clip_effect": {
      // body: { trackId, clipId, field: "filter"|"transition"|"ken_burns", value }
      const tr = findTrack(body.trackId as string);
      const clip = tr.clips.find((c) => c.id === body.clipId);
      if (!clip) throw new Error("Clip not found");
      const field = body.field as "filter" | "transition" | "ken_burns";
      const value = body.value;
      // Cast clip to allow effect fields
      const c = clip as TimelineClip & {
        filter?: string;
        transition?: { type: string; duration: number };
        ken_burns?: { enabled: boolean; direction: string; intensity: number };
      };
      if (field === "filter") c.filter = value as string;
      else if (field === "transition") c.transition = value as { type: string; duration: number };
      else if (field === "ken_burns") c.ken_burns = value as { enabled: boolean; direction: string; intensity: number };
      return next;
    }

    case "set_full_timeline": {
      return body.timeline_data as TimelineData;
    }

    default:
      throw new Error(`Unknown op: ${op}`);
  }
}
