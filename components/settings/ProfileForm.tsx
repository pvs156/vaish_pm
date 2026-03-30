"use client";

import { useState } from "react";
import type { UserProfile, WorkModel } from "@/lib/types";

interface ProfileFormProps {
  initial: UserProfile | null;
}

type ExtractedPreview = {
  preferredSkills?: string[];
  preferredTitles?: string[];
  preferredLocations?: string[];
  preferredWorkModel?: WorkModel[];
};

const ALL_WORK_MODELS = ["remote", "hybrid", "onsite"] as const;
type WorkModelOption = (typeof ALL_WORK_MODELS)[number];

export function ProfileForm({ initial }: ProfileFormProps) {
  const empty: Omit<UserProfile, "id" | "updatedAt"> = {
    resumeText: null,
    preferredSkills: [],
    preferredTitles: [],
    preferredLocations: [],
    preferredWorkModel: [],
  };

  const [state, setState] = useState({ ...empty, ...initial });
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [preview, setPreview] = useState<ExtractedPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const listToText = (arr: string[]) => arr.join(", ");
  const textToList = (text: string) =>
    text.split(",").map((s) => s.trim()).filter(Boolean);

  const toggleWorkModel = (model: WorkModelOption) => {
    setState((s) => ({
      ...s,
      preferredWorkModel: s.preferredWorkModel.includes(model)
        ? s.preferredWorkModel.filter((m) => m !== model)
        : [...s.preferredWorkModel, model],
    }));
  };

  const handleExtract = async () => {
    if (!state.resumeText?.trim()) return;
    setExtracting(true);
    setPreview(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText: state.resumeText }),
      });
      const data = await res.json();
      if (res.ok) setPreview(data);
      else setMessage(data.error ?? "Extraction failed");
    } catch {
      setMessage("Network error");
    } finally {
      setExtracting(false);
    }
  };

  const applyPreview = () => {
    if (!preview) return;
    setState((s) => ({
      ...s,
      preferredSkills: preview.preferredSkills ?? s.preferredSkills,
      preferredTitles: preview.preferredTitles ?? s.preferredTitles,
      preferredLocations: preview.preferredLocations ?? s.preferredLocations,
      preferredWorkModel: preview.preferredWorkModel ?? s.preferredWorkModel,
    }));
    setPreview(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: state.resumeText,
          preferredSkills: state.preferredSkills,
          preferredTitles: state.preferredTitles,
          preferredLocations: state.preferredLocations,
          preferredWorkModel: state.preferredWorkModel,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Profile saved. Jobs will be rescored in the background.");
      } else {
        setMessage(data.error ?? "Save failed");
      }
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Resume text */}
      <div>
        <label className="block text-[12px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
          Resume text
        </label>
        <textarea
          rows={14}
          value={state.resumeText ?? ""}
          onChange={(e) => setState((s) => ({ ...s, resumeText: e.target.value || null }))}
          placeholder="Paste your resume or bio here…"
          className="w-full text-[13px] border border-stone-200 rounded-lg px-3.5 py-3 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white placeholder:text-stone-300"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleExtract}
            disabled={extracting || !state.resumeText?.trim()}
            className="text-[12px] font-medium px-3.5 py-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 transition-colors"
          >
            {extracting ? "Extracting…" : "Extract skills & prefs"}
          </button>
          {preview && (
            <button
              onClick={applyPreview}
              className="text-[12px] font-medium px-3.5 py-1.5 rounded bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              Apply extracted values
            </button>
          )}
        </div>

        {preview && (
          <div className="mt-3 bg-brand-50 border border-brand-100 rounded-lg p-4 text-[12px] space-y-1.5 text-stone-700">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700 mb-2">Extracted preview</p>
            {preview.preferredSkills && <p><span className="text-stone-500">Skills:</span> {preview.preferredSkills.join(", ")}</p>}
            {preview.preferredTitles && <p><span className="text-stone-500">Titles:</span> {preview.preferredTitles.join(", ")}</p>}
            {preview.preferredLocations && <p><span className="text-stone-500">Locations:</span> {preview.preferredLocations.join(", ")}</p>}
            {preview.preferredWorkModel && <p><span className="text-stone-500">Work model:</span> {preview.preferredWorkModel.join(", ")}</p>}
          </div>
        )}
      </div>

      {/* Preferred Titles */}
      <div>
        <label className="block text-[12px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
          Preferred job titles <span className="normal-case font-normal text-stone-400">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={listToText(state.preferredTitles)}
          onChange={(e) =>
            setState((s) => ({ ...s, preferredTitles: textToList(e.target.value) }))
          }
          placeholder="Product Manager Intern, APM, Associate PM…"
          className="w-full text-[13px] border border-stone-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white placeholder:text-stone-300"
        />
      </div>

      {/* Skills */}
      <div>
        <label className="block text-[12px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
          Skills <span className="normal-case font-normal text-stone-400">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={listToText(state.preferredSkills)}
          onChange={(e) =>
            setState((s) => ({ ...s, preferredSkills: textToList(e.target.value) }))
          }
          placeholder="SQL, analytics, roadmapping, Figma, user research…"
          className="w-full text-[13px] border border-stone-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white placeholder:text-stone-300"
        />
      </div>

      {/* Locations */}
      <div>
        <label className="block text-[12px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
          Preferred locations <span className="normal-case font-normal text-stone-400">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={listToText(state.preferredLocations)}
          onChange={(e) =>
            setState((s) => ({ ...s, preferredLocations: textToList(e.target.value) }))
          }
          placeholder="San Francisco, New York, Remote…"
          className="w-full text-[13px] border border-stone-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent bg-white placeholder:text-stone-300"
        />
      </div>

      {/* Work model */}
      <div>
        <label className="block text-[12px] font-semibold text-stone-500 uppercase tracking-wider mb-3">
          Work model
        </label>
        <div className="flex gap-5">
          {ALL_WORK_MODELS.map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={state.preferredWorkModel.includes(m)}
                onChange={() => toggleWorkModel(m)}
                className="accent-brand-600 w-3.5 h-3.5"
              />
              <span className="text-[13px] capitalize text-stone-700">{m}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4 pt-2 border-t border-stone-100">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-brand-600 text-white text-[13px] font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        {message && (
          <p className="text-[13px] text-stone-500">{message}</p>
        )}
      </div>
    </div>
  );
}
