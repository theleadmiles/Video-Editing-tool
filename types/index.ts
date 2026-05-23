export type UserPlan = "free" | "creator" | "pro" | "team" | "agency";

export type ProjectStatus = "draft" | "generating" | "ready" | "exported";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5";

export type AssetType = "video" | "image" | "audio";

export type AssetSource = "uploaded" | "pexels" | "pixabay" | "ai_generated" | "elevenlabs";

export type AIProvider = "claude" | "elevenlabs" | "runway" | "whisper" | "pexels";

export type GenerationType = "script" | "voiceover" | "video_clip" | "caption" | "broll";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: UserPlan;
  created_at: string;
}

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  plan: UserPlan;
  credits_remaining: number;
  created_at: string;
}

export interface Project {
  id: string;
  workspace_id: string;
  title: string;
  script: string | null;
  duration_seconds: number | null;
  aspect_ratio: AspectRatio;
  status: ProjectStatus;
  timeline_data: TimelineData | null;
  thumbnail_url: string | null;
  final_video_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineTrack {
  id: string;
  type: "video" | "text" | "audio" | "effect";
  clips: TimelineClip[];
}

export interface TimelineClip {
  id: string;
  asset_id?: string;
  url?: string;
  thumbnail?: string;
  start_time: number;
  duration: number;
  trim_start?: number;
  trim_end?: number;
  // Text / caption specific
  text?: string;
  font_family?: string;
  font_size?: number;
  font_weight?: number;
  color?: string;
  animation?: string;
  position?: { x: number; y: number };
  // Extended caption style (set when a template is applied)
  text_transform?: "uppercase" | "lowercase" | "none";
  letter_spacing?: number;         // em units, e.g. 0.05
  stroke_color?: string;           // outline colour
  stroke_width?: number;           // outline width in px
  background_css?: string;         // CSS background value, e.g. "rgba(0,0,0,0.75)"
  bg_padding?: string;             // CSS padding, e.g. "4px 10px"
  max_width_pct?: number;          // max-width as % of frame (0–100)
  word_timings?: { word: string; start: number; end: number }[];
  // Audio specific
  volume?: number;
  // Playback
  speed?: number;
  // Phase 16 — Visual effects
  filter?: string; // id from COLOR_FILTERS
  transition?: { type: string; duration: number };
  ken_burns?: { enabled: boolean; direction: string; intensity: number };
  color_grade?: { brightness: number; contrast: number; saturation: number };
}

/** User-saved caption preset stored in the DB */
export interface SavedCaptionPreset {
  id: string;
  workspace_id: string;
  name: string;
  brand_tag?: string | null;
  style: import("@/lib/caption-styles").CaptionStyle;
  is_default: boolean;
  created_at: string;
}

export interface TimelineData {
  tracks: TimelineTrack[];
  duration: number;
  aspect_ratio: AspectRatio;
  background_color?: string;
}

export interface Asset {
  id: string;
  workspace_id: string;
  type: AssetType;
  source: AssetSource;
  url: string;
  duration_seconds: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BrandKit {
  id: string;
  workspace_id: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_heading: string;
  font_body: string;
  default_voice_id: string | null;
  created_at: string;
}

export interface GenerationProgress {
  step: string;
  label: string;
  done: boolean;
}
