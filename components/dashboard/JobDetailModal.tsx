"use client";

import { useCallback } from "react";
import type { JobListItem } from "@/lib/types";
import { timeAgo, formatDate } from "@/lib/utils/dates";
import { ScoreBadge } from "./ScoreBadge";

interface JobDetailModalProps {
  job: JobListItem | null;
  onClose: () => void;
  onAction: (
    jobId: string,
    action: "save" | "dismiss" | "apply" | "unsave" | "undismiss"
  ) => Promise<void>;
}

const SOURCE_LABELS: Record<string, string> = {
  jobright_github: "Jobright",
  simplifyjobs_github: "Simplify",
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  manual: "Manual",
};

export function JobDetailModal({ job, onClose, onAction }: JobDetailModalProps) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!job) return null;

  const isSaved    = job.userStatus === "saved";
  const isApplied  = job.userStatus === "applied";
  const isDismissed = job.userStatus === "dismissed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-stone-900/20 backdrop-blur-[2px]"
      onClick={handleBackdropClick}
    >
      <div className="h-full w-full max-w-lg bg-white border-l border-stone-200 shadow-xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
              {SOURCE_LABELS[job.source] ?? job.source}
            </p>
            <h2 className="font-semibold text-stone-900 text-base leading-snug tracking-tight">
              {job.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 shrink-0 w-7 h-7 flex items-center justify-center rounded text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex-1 space-y-6">
          {/* Company + meta */}
          <div>
            <p className="text-lg font-semibold text-stone-800 tracking-tight">{job.company}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[12px] text-stone-500">
              {job.locations.length > 0 && <span>{job.locations.join(", ")}</span>}
              {job.workModel !== "unknown" && (
                <span className="capitalize">{job.workModel}</span>
              )}
              {job.postedAt && (
                <span>Posted {formatDate(job.postedAt)}</span>
              )}
            </div>
          </div>

          {/* Status badges */}
          {(isApplied || isSaved || isDismissed) && (
            <div className="flex gap-2 flex-wrap">
              {isApplied && (
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  ✓ Applied {job.appliedAt ? timeAgo(job.appliedAt) : ""}
                </span>
              )}
              {isSaved && (
                <span className="text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-0.5 rounded-full">
                  Saved
                </span>
              )}
              {isDismissed && (
                <span className="text-[11px] font-semibold bg-stone-50 text-stone-500 border border-stone-200 px-2.5 py-0.5 rounded-full">
                  Dismissed
                </span>
              )}
            </div>
          )}

          {/* Fit score + reasons */}
          {(job.fitScore !== null || job.fitReasons.length > 0) && (
            <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">Fit score</p>
                {job.fitScore !== null && <ScoreBadge score={job.fitScore} size="lg" />}
                {job.fitScore !== null && (
                  <span className="text-[12px] text-stone-400">/ 100</span>
                )}
              </div>

              {job.fitExplanation && (
                <p className="text-[13px] text-stone-600">{job.fitExplanation}</p>
              )}

              {job.fitReasons.length > 0 && (
                <ul className="space-y-1.5">
                  {job.fitReasons.map((reason, idx) => (
                    <li key={idx} className="text-[13px] text-stone-700 flex items-start gap-2">
                      <span className="text-brand-400 mt-0.5 shrink-0">–</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Description */}
          {job.description && (
            <div>
              <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">About the role</p>
              <p className="text-[13px] text-stone-600 whitespace-pre-wrap leading-relaxed line-clamp-[20]">
                {job.description}
              </p>
            </div>
          )}

          {/* Links */}
          <div className="space-y-1">
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[12px] text-brand-600 hover:underline truncate"
            >
              {job.applyUrl}
            </a>
            {job.sourceUrl !== job.applyUrl && (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[12px] text-stone-400 hover:underline truncate"
              >
                {job.sourceUrl}
              </a>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-stone-100 px-6 py-4 flex gap-2">
          {!isApplied && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onAction(job.id, "apply")}
              className="flex-1 text-center text-[13px] font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2.5 rounded-lg transition-colors"
            >
              Apply Now →
            </a>
          )}

          {!isSaved && !isDismissed && !isApplied && (
            <button
              onClick={() => onAction(job.id, "save")}
              className="text-[13px] font-medium px-4 py-2.5 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
            >
              Save
            </button>
          )}

          {isSaved && (
            <button
              onClick={() => onAction(job.id, "unsave")}
              className="text-[13px] px-4 py-2.5 border border-stone-200 text-stone-400 hover:bg-stone-50 rounded-lg transition-colors"
            >
              Unsave
            </button>
          )}

          {!isDismissed && !isApplied && (
            <button
              onClick={() => { onAction(job.id, "dismiss"); onClose(); }}
              className="text-[13px] px-4 py-2.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              Dismiss
            </button>
          )}

          {isDismissed && (
            <button
              onClick={() => onAction(job.id, "undismiss")}
              className="text-[13px] px-4 py-2.5 border border-stone-200 text-stone-500 hover:bg-stone-50 rounded-lg transition-colors"
            >
              Restore
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
