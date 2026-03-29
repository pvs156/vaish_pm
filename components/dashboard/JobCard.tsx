"use client";

import { useState } from "react";
import type { JobListItem } from "@/lib/types";
import { timeAgo } from "@/lib/utils/dates";

interface JobCardProps {
  job: JobListItem;
  onAction: (jobId: string, action: "save" | "dismiss" | "apply" | "unsave" | "undismiss") => Promise<void>;
  onExpand: (job: JobListItem) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  jobright_github: "Jobright",
  simplifyjobs_github: "SimplifyJobs",
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  manual: "Manual",
};

const SOURCE_COLORS: Record<string, string> = {
  jobright_github: "bg-violet-100 text-violet-700",
  simplifyjobs_github: "bg-blue-100 text-blue-700",
  greenhouse: "bg-emerald-100 text-emerald-700",
  lever: "bg-orange-100 text-orange-700",
  ashby: "bg-rose-100 text-rose-700",
  manual: "bg-gray-100 text-gray-600",
};

const WORK_MODEL_ICONS: Record<string, string> = {
  remote: "🌐",
  hybrid: "🏙",
  onsite: "🏢",
  unknown: "",
};

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="text-xs text-gray-400 italic">Unscored — set profile to rank</span>
    );
  }

  const color =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
      ? "bg-brand-500"
      : score >= 40
      ? "bg-amber-400"
      : "bg-gray-300";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span
        className={`text-xs font-semibold tabular-nums ${
          score >= 80
            ? "text-emerald-600"
            : score >= 60
            ? "text-brand-600"
            : score >= 40
            ? "text-amber-600"
            : "text-gray-400"
        }`}
      >
        {score}
      </span>
    </div>
  );
}

export function JobCard({ job, onAction, onExpand }: JobCardProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (
    action: "save" | "dismiss" | "apply" | "unsave" | "undismiss"
  ) => {
    setLoading(action);
    try {
      await onAction(job.id, action);
    } finally {
      setLoading(null);
    }
  };

  const referenceDate = job.postedAt ?? job.firstSeenAt;
  const timeLabel = timeAgo(referenceDate);

  const isDismissed = job.userStatus === "dismissed";
  const isApplied = job.userStatus === "applied";
  const isSaved = job.userStatus === "saved";

  return (
    <div
      className={`group bg-white border rounded-xl p-4 transition-all hover:shadow-md ${
        isDismissed ? "opacity-50" : isApplied ? "border-emerald-200 bg-emerald-50" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Left: content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex flex-wrap items-start gap-1.5 mb-1">
            <span
              className={`inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded ${
                SOURCE_COLORS[job.source] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {SOURCE_LABELS[job.source] ?? job.source}
            </span>
            {job.workModel !== "unknown" && (
              <span className="text-xs text-gray-500">
                {WORK_MODEL_ICONS[job.workModel]} {job.workModel}
              </span>
            )}
            {isApplied && (
              <span className="text-xs font-medium text-emerald-600">✓ Applied</span>
            )}
            {isSaved && (
              <span className="text-xs font-medium text-brand-600">★ Saved</span>
            )}
          </div>

          {/* Title + company */}
          <button
            onClick={() => onExpand(job)}
            className="text-left w-full group/title"
          >
            <h3 className="font-semibold text-gray-900 group-hover/title:text-brand-600 transition-colors leading-snug">
              {job.title}
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              {job.company}
              {job.locations.length > 0 && (
                <span className="text-gray-400"> · {job.locations[0]}</span>
              )}
            </p>
          </button>

          {/* Score */}
          <div className="mt-2">
            <ScoreBar score={job.fitScore} />
          </div>

          {/* Match reasons */}
          {job.fitReasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {job.fitReasons.slice(0, 3).map((reason, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-100"
                >
                  {reason}
                </span>
              ))}
            </div>
          )}

          {/* Footer: time + actions */}
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-gray-400">{timeLabel}</span>

            <div className="flex items-center gap-1.5 ml-auto">
              {/* Save/Unsave */}
              {!isDismissed && !isApplied && (
                <button
                  onClick={() => handleAction(isSaved ? "unsave" : "save")}
                  disabled={loading !== null}
                  title={isSaved ? "Unsave" : "Save"}
                  className={`text-sm px-2 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                    isSaved
                      ? "text-brand-600 bg-brand-50 hover:bg-brand-100"
                      : "text-gray-400 hover:text-brand-600 hover:bg-brand-50"
                  }`}
                >
                  {loading === "save" || loading === "unsave" ? "…" : "★"}
                </button>
              )}

              {/* Dismiss/Undismiss */}
              {!isApplied && (
                <button
                  onClick={() => handleAction(isDismissed ? "undismiss" : "dismiss")}
                  disabled={loading !== null}
                  title={isDismissed ? "Restore" : "Dismiss"}
                  className="text-sm px-2 py-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {loading === "dismiss" || loading === "undismiss"
                    ? "…"
                    : isDismissed
                    ? "↩"
                    : "✕"}
                </button>
              )}

              {/* Apply */}
              {!isApplied && (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleAction("apply")}
                  className="text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 px-3 py-1 rounded-lg transition-colors"
                >
                  Apply ↗
                </a>
              )}

              {isApplied && (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg transition-colors"
                >
                  View ↗
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
