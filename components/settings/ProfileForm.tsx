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
    <div className="space-y-6 max-w-2xl">
      {/* Resume */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Resume / Bio text
        </label>
        <textarea
          rows={14}
          value={state.resumeText ?? ""}
          onChange={(e) => setState((s) => ({ ...s, resumeText: e.target.value || null }))}
          placeholder="Paste your resume or a short bio here..."
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleExtract}
            disabled={extracting || !state.resumeText?.trim()}
            className="text-sm px-3 py-1.5 rounded-lg border border-brand-200 text-brand-700 hover:bg-brand-50 disabled:opacity-40 transition-colors"
          >
            {extracting ? "Extracting..." : "Extract skills & prefs"}
          </button>
          {preview && (
            <button
              onClick={applyPreview}
              className="text-sm px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              Apply extracted values
            </button>
          )}
        </div>

        {preview && (
          <div className="mt-3 bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm space-y-1 text-brand-900">
            <p className="font-medium mb-2">Extracted preview</p>
            {preview.preferredSkills && <p>Skills: {preview.preferredSkills.join(", ")}</p>}
            {preview.preferredTitles && <p>Titles: {preview.preferredTitles.join(", ")}</p>}
            {preview.preferredLocations && <p>Locations: {preview.preferredLocations.join(", ")}</p>}
            {preview.preferredWorkModel && <p>Work model: {preview.preferredWorkModel.join(", ")}</p>}
          </div>
        )}
      </div>

      {/* Preferred Titles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Preferred job titles <span className="text-gray-400 font-normal">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={listToText(state.preferredTitles)}
          onChange={(e) =>
            setState((s) => ({ ...s, preferredTitles: textToList(e.target.value) }))
          }
          placeholder="Product Manager Intern, APM, Associate PM..."
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {/* Skills */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Skills <span className="text-gray-400 font-normal">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={listToText(state.preferredSkills)}
          onChange={(e) =>
            setState((s) => ({ ...s, preferredSkills: textToList(e.target.value) }))
          }
          placeholder="SQL, analytics, roadmapping, Figma, user research..."
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {/* Locations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Preferred locations <span className="text-gray-400 font-normal">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={listToText(state.preferredLocations)}
          onChange={(e) =>
            setState((s) => ({ ...s, preferredLocations: textToList(e.target.value) }))
          }
          placeholder="San Francisco, New York, Remote..."
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
      </div>

      {/* Work model */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Work model preferences <span className="text-gray-400 font-normal">(select all that apply)</span>
        </label>
        <div className="flex gap-4">
          {ALL_WORK_MODELS.map((m) => (
            <label key={m} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={state.preferredWorkModel.includes(m)}
                onChange={() => toggleWorkModel(m)}
                className="accent-brand-600"
              />
              <span className="text-sm capitalize text-gray-700">{m}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
        {message && <p className="text-sm text-gray-500">{message}</p>}
      </div>
    </div>
  );
}
