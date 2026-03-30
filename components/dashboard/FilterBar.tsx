"use client";

import { useState, useCallback } from "react";
import type { JobFilters, TimeWindow, SortOrder, WorkModel, SourceId } from "@/lib/types";

interface FilterBarProps {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
  isLoading: boolean;
}

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: "24h", label: "Last 24h" },
  { value: "48h", label: "Last 48h" },
  { value: "7d", label: "Last 7 days" },
  { value: "all", label: "All time" },
];

const SOURCES: { value: SourceId | "all"; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "jobright_github", label: "Jobright" },
  { value: "simplifyjobs_github", label: "SimplifyJobs" },
  { value: "greenhouse", label: "Greenhouse" },
  { value: "lever", label: "Lever" },
  { value: "ashby", label: "Ashby" },
];

const WORK_MODELS: { value: WorkModel | "all"; label: string }[] = [
  { value: "all", label: "Any work model" },
  { value: "remote", label: "🌐 Remote" },
  { value: "hybrid", label: "🏙 Hybrid" },
  { value: "onsite", label: "🏢 On-site" },
];

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "best_fit", label: "Best fit" },
  { value: "newest", label: "Newest first" },
];

export function FilterBar({ filters, onChange, isLoading }: FilterBarProps) {
  const update = useCallback(
    (patch: Partial<JobFilters>) => onChange({ ...filters, ...patch }),
    [filters, onChange]
  );

  return (
    <div className="px-6 py-3 space-y-2.5">
      {/* Row 1: time window chips + sort */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {TIME_WINDOWS.map((tw) => (
            <button
              key={tw.value}
              onClick={() => update({ window: tw.value })}
              className={`px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${
                filters.window === tw.value
                  ? "bg-stone-900 text-white"
                  : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
              }`}
            >
              {tw.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 ml-auto">
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => update({ sort: s.value })}
              className={`px-3 py-1 text-[12px] font-medium rounded-full transition-colors ${
                filters.sort === s.value
                  ? "bg-brand-600 text-white"
                  : "text-stone-500 hover:text-stone-800 hover:bg-stone-100"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: dropdowns + location + min score */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filters.source}
          onChange={(e) => update({ source: e.target.value as JobFilters["source"] })}
          className="text-[12px] border border-stone-200 rounded-full px-3 py-1 text-stone-600 bg-white hover:border-stone-300 transition-colors"
        >
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <select
          value={filters.workModel}
          onChange={(e) => update({ workModel: e.target.value as JobFilters["workModel"] })}
          className="text-[12px] border border-stone-200 rounded-full px-3 py-1 text-stone-600 bg-white hover:border-stone-300 transition-colors"
        >
          {WORK_MODELS.map((wm) => (
            <option key={wm.value} value={wm.value}>{wm.label}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Location…"
          value={filters.location}
          onChange={(e) => update({ location: e.target.value })}
          className="text-[12px] border border-stone-200 rounded-full px-3 py-1 text-stone-600 placeholder:text-stone-400 w-36 focus:outline-none focus:border-brand-400"
        />

        <div className="flex items-center gap-2">
          <label className="text-[12px] text-stone-500 whitespace-nowrap">Min fit:</label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minScore}
            onChange={(e) => update({ minScore: Number(e.target.value) })}
            className="w-20 accent-brand-600"
          />
          <span className="text-[12px] text-stone-700 font-medium w-6 text-right tabular-nums">{filters.minScore}</span>
        </div>

        {isLoading && (
          <div className="ml-auto flex items-center gap-1.5 text-[12px] text-stone-400">
            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading…
          </div>
        )}
      </div>

      {/* Row 3: show/hide toggles */}
      <div className="flex gap-4 text-[12px] text-stone-500">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.includeDismissed}
            onChange={(e) => update({ includeDismissed: e.target.checked })}
            className="accent-brand-600"
          />
          Show dismissed
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.includeApplied}
            onChange={(e) => update({ includeApplied: e.target.checked })}
            className="accent-brand-600"
          />
          Show applied
        </label>
      </div>
    </div>
  );
}
