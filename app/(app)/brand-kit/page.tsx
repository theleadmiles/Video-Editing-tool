"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Palette, Type, Mic2, Save, Loader2 } from "lucide-react";
import { FEATURED_VOICES } from "@/lib/ai/elevenlabs";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  "#F0A500", "#FF4D4D", "#3B82F6", "#10B981",
  "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4",
];

const FONT_OPTIONS = [
  "Inter", "Geist Sans", "Poppins", "Montserrat",
  "Playfair Display", "Space Grotesk", "DM Sans",
];

export default function BrandKitPage() {
  const supabase = createClient();

  const [primaryColor, setPrimaryColor] = useState("#F0A500");
  const [secondaryColor, setSecondaryColor] = useState("#FF4D4D");
  const [fontHeading, setFontHeading] = useState("Inter");
  const [fontBody, setFontBody] = useState("Inter");
  const [defaultVoice, setDefaultVoice] = useState(FEATURED_VOICES[0].voice_id);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!workspace) return;
      setWorkspaceId(workspace.id);

      const { data: kit } = await supabase
        .from("brand_kits")
        .select("*")
        .eq("workspace_id", workspace.id)
        .single();

      if (kit) {
        setPrimaryColor(kit.primary_color || "#F0A500");
        setSecondaryColor(kit.secondary_color || "#FF4D4D");
        setFontHeading(kit.font_heading || "Inter");
        setFontBody(kit.font_body || "Inter");
        setDefaultVoice(kit.default_voice_id || FEATURED_VOICES[0].voice_id);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!workspaceId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("brand_kits")
        .upsert({
          workspace_id: workspaceId,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: primaryColor,
          font_heading: fontHeading,
          font_body: fontBody,
          default_voice_id: defaultVoice,
        }, { onConflict: "workspace_id" });

      if (error) throw error;
      toast.success("Brand kit saved!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 text-gold-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-white">Brand Kit</h1>
        <p className="mt-1 text-sm text-subtle">
          Set your brand identity. It auto-applies to every new video.
        </p>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* Colors */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-5 flex items-center gap-2">
            <Palette className="h-4 w-4 text-gold-500" />
            <h2 className="font-semibold text-white">Brand Colors</h2>
          </div>

          <div className="space-y-5">
            {[
              { label: "Primary color", value: primaryColor, onChange: setPrimaryColor },
              { label: "Accent color", value: secondaryColor, onChange: setSecondaryColor },
            ].map(({ label, value, onChange }) => (
              <div key={label}>
                <label className="mb-2 block text-sm text-subtle">{label}</label>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => onChange(c)}
                        className={cn(
                          "h-8 w-8 rounded-lg border-2 transition-all",
                          value === c ? "border-white scale-110" : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg border border-border" style={{ backgroundColor: value }} />
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      className="h-8 w-16 rounded cursor-pointer bg-transparent border-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="mt-5 rounded-xl overflow-hidden border border-border">
            <div
              className="h-16 flex items-center justify-center gap-4"
              style={{ background: `linear-gradient(135deg, ${primaryColor}22, ${secondaryColor}22)` }}
            >
              <div className="h-6 w-6 rounded-full" style={{ backgroundColor: primaryColor }} />
              <div className="h-2 w-24 rounded-full" style={{ backgroundColor: primaryColor }} />
              <div
                className="h-8 w-20 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Button
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-5 flex items-center gap-2">
            <Type className="h-4 w-4 text-gold-500" />
            <h2 className="font-semibold text-white">Typography</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Heading font", value: fontHeading, onChange: setFontHeading },
              { label: "Body font", value: fontBody, onChange: setFontBody },
            ].map(({ label, value, onChange }) => (
              <div key={label}>
                <label className="mb-2 block text-sm text-subtle">{label}</label>
                <select
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-white focus:border-gold-500 focus:outline-none"
                >
                  {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            ))}
          </div>
          {/* Font preview */}
          <div className="mt-4 rounded-xl border border-border bg-elevated p-4 space-y-1">
            <p className="text-white text-lg font-bold" style={{ fontFamily: fontHeading }}>
              Heading: {fontHeading}
            </p>
            <p className="text-subtle text-sm" style={{ fontFamily: fontBody }}>
              Body text in {fontBody} — looks great for captions and overlays.
            </p>
          </div>
        </section>

        {/* Default Voice */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <div className="mb-5 flex items-center gap-2">
            <Mic2 className="h-4 w-4 text-gold-500" />
            <h2 className="font-semibold text-white">Default Voice</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FEATURED_VOICES.slice(0, 6).map((v) => (
              <button
                key={v.voice_id}
                onClick={() => setDefaultVoice(v.voice_id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                  defaultVoice === v.voice_id
                    ? "border-gold-500/50 bg-gold-500/10"
                    : "border-border hover:border-border-strong"
                )}
              >
                <div className={cn(
                  "h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold",
                  defaultVoice === v.voice_id ? "bg-gold-500 text-black" : "bg-elevated text-subtle"
                )}>
                  {v.name[0]}
                </div>
                <div>
                  <p className={cn("text-sm font-medium", defaultVoice === v.voice_id ? "text-gold-500" : "text-white")}>
                    {v.name}
                  </p>
                  <p className="text-xs text-muted">{v.style}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <Button size="lg" className="w-full" onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4" />
          Save brand kit
        </Button>
      </div>
    </div>
  );
}
