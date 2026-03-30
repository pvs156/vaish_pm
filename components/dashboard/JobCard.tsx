"use client";

import { useState } from "react";
import type { JobListItem } from "@/lib/types";
import { timeAgo } from "@/lib/utils/dates";
import { ScoreBadge } from "./ScoreBadge";

interface JobCardProps {
  job: JobListItem;
  onAction: (jobId: string, action: "save" | "dismiss" | "apply" | "unsave" | "undismiss") => Promise<void>;
  onExpand: (job: JobListItem) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  jobright_github: "Jobright",
  simplifyjobs_github: "Simplify",
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  manual: "Manual",
};

const SOURCE_DOT: Record<string, string> = {
  jobright_github:    "bg-violet-400",
  simplifyjobs_github:"bg-sky-400",
  greenhouse:         "bg-emerald-400",
  lever:              "bg-orange-400",
  ashby:              "bg-rose-400",
  manual:             "bg-stone-400",
};

const WORK_MODEL_LABEL: Record<string, string> = {
  remote:  "Remote",
  hybrid:  "Hybrid",
  onsite:  "On-site",
  unknown: "",
};

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
  const isApplied  = job.userStatus === "applied";
  const isSaved    = job.userStatus === "saved";

  return (
    <div
      className={`group bg-white border transition-all ${
        isDismissed
          ? "opacity-40 border-stone-200"
          : isApplied
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-stone-200 hover:border-stone-300 hover:shadow-sm"
      } rounded-lg`}
    >
      <div className="flex items-stretch">
        {/* Score strip on left */}
        <div className="flex items-center justify-center px-4 border-r border-stone-100">
          <ScoreBadge score={job.fitScore} size="sm" />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 px-4 py-3">
          {/* Meta row */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-stone-500">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                SOURCE_DOT[job.source] ?? "bg-stone-400"
              }`} />
              {SOURCE_LABELS[job.source] ?? job.source}
            </span>
            {job.workModel !== "unknown" && (
              <span className="text-[11px] text-stone-400">
                {WORK_MODEL_LABEL[job.workModel]}
              </span>
            )}
            {isApplied && (
              <span className="text-[11px] font-semibold text-emerald-600 ml-auto">Applied</span>
            )}
            {isSaved && !isApplied && (
              <span className="text-[11px] font-semibold text-brand-600 ml-auto">Saved</span>
            )}
          </div>

          {/* Title + company */}
          <button onClick={() => onExpand(job)} className="text-left w-full">
            <h3 className="font-semibold text-[15px] text-stone-900 group-hover:text-brand-700 transition-colors leading-snug tracking-tight">
              {job.title}
            </h3>
            <p className="text-[13px] text-stone-500 mt-0.5">
              {job.company}
              {job.locations.length > 0 && (
                <span className="text-stone-400"> &middot; {job.locations[0]}</span>
              )}
            </p>
          </button>

          {/* Match reasons */}
          {job.fitReasons.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {job.fitReasons.slice(0, 3).map((reason, idx) => (
                <span
                  key={idx}
                  className="text-[11px] text-stone-500 bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded"
                >
                  {reason}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[11px] text-stone-400">{timeLabel}</span>

            <div className="flex items-center gap-1 ml-auto">
              {!isDismissed && !isApplied && (
                <button
                  onClick={() => handleAction(isSaved ? "unsave" : "save")}
                  disabled={loading !== null}
                  className={`text-[12px] px-2.5 py-1 rounded transition-colors disabled:opacity-50 ${
                    isSaved
                      ? "text-brand-600 bg-brand-50 hover:bg-brand-100"
                      : "text-stone-400 hover:text-brand-600 hover:bg-brand-50"
                  }`}
                >
                  {loading === "save" || loading === "unsave" ? "…" : isSaved ? "Saved" : "Save"}
                </button>
              )}

              {!isApplied && (
                <button
                  onClick={() => handleAction(isDismissed ? "undismiss" : "dismiss")}
                  disabled={loading !== null}
                  className="text-[12px] px-2.5 py-1 rounded text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {loading === "dismiss" || loading === "undismiss"
                    ? "…"
                    : isDismissed
                    ? "Restore"
                    : "Dismiss"}
                </button>
              )}

              {!isApplied ? (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleAction("apply")}
                  className="text-[12px] font-medium text-white bg-brand-600 hover:bg-brand-700 px-3 py-1 rounded transition-colors"
                >
                  Apply →
                </a>
              ) : (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-stone-400 hover:text-stone-600 px-2.5 py-1 rounded transition-colors"
                >
                  View
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
