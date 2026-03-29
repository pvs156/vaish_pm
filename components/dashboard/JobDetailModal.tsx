"use client";

import { useCallback } from "react";
import type { JobListItem } from "@/lib/types";
import { timeAgo, formatDate } from "@/lib/utils/dates";

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
  simplifyjobs_github: "SimplifyJobs",
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

  const isSaved = job.userStatus === "saved";
  const isApplied = job.userStatus === "applied";
  const isDismissed = job.userStatus === "dismissed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-lg leading-snug line-clamp-1">
            {job.title}
          </h2>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            â
          </button>
        </div>

        <div className="p-6 flex-1 space-y-5">
          {/* Company + meta */}
          <div>
            <p className="text-xl font-medium text-gray-800">{job.company}</p>
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-500">
              {job.locations.length > 0 && <span>ðâ {job.locations.join(", ")}</span>}
              {job.workModel !== "unknown" && <span>Â· {job.workModel}</span>}
              {job.postedAt && (
                <span>Â· Posted {formatDate(job.postedAt)}</span>
              )}
              <span className="capitalize">
                Â· via {SOURCE_LABELS[job.source] ?? job.source}
              </span>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex gap-2 flex-wrap">
            {isApplied && (
              <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                ââ Applied {job.appliedAt ? timeAgo(job.appliedAt) : ""}
              </span>
            )}
            {isSaved && (
              <span className="text-xs font-medium bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full">
                â... Saved
              </span>
            )}
            {isDismissed && (
              <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                Dismissed
              </span>
            )}
          </div>

          {/* Fit score + reasons */}
          {(job.fitScore !== null || job.fitReasons.length > 0) && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {job.fitScore !== null && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Fit score</span>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        job.fitScore >= 80
                          ? "bg-emerald-500"
                          : job.fitScore >= 60
                          ? "bg-brand-500"
                          : job.fitScore >= 40
                          ? "bg-amber-400"
                          : "bg-gray-300"
                      }`}
                      style={{ width: `${job.fitScore}%` }}
                    />
                  </div>
                  <span className="text-lg font-bold text-gray-900 tabular-nums w-10 text-right">
                    {job.fitScore}
                  </span>
                </div>
              )}

              {job.fitExplanation && (
                <p className="text-sm text-gray-600 italic">{job.fitExplanation}</p>
              )}

              {job.fitReasons.length > 0 && (
                <ul className="space-y-1">
                  {job.fitReasons.map((reason, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-1.5">
                      <span className="text-brand-500 mt-0.5">âº</span>
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
              <h3 className="text-sm font-semibold text-gray-700 mb-2">About the role</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed line-clamp-[20]">
                {job.description}
              </p>
            </div>
          )}

          {/* Links */}
          <div className="space-y-1.5">
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-brand-600 hover:underline truncate"
            >
              Apply: {job.applyUrl}
            </a>
            {job.sourceUrl !== job.applyUrl && (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-gray-400 hover:underline truncate"
              >
                Source: {job.sourceUrl}
              </a>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-2">
          {!isApplied && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onAction(job.id, "apply")}
              className="flex-1 text-center font-medium text-white bg-brand-600 hover:bg-brand-700 px-4 py-2.5 rounded-xl transition-colors"
            >
              Apply Now â--
            </a>
          )}

          {!isSaved && !isDismissed && !isApplied && (
            <button
              onClick={() => onAction(job.id, "save")}
              className="px-4 py-2.5 border border-brand-200 text-brand-600 hover:bg-brand-50 rounded-xl transition-colors font-medium"
            >
              Save
            </button>
          )}

          {isSaved && (
            <button
              onClick={() => onAction(job.id, "unsave")}
              className="px-4 py-2.5 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
            >
              Unsave
            </button>
          )}

          {!isDismissed && !isApplied && (
            <button
              onClick={() => { onAction(job.id, "dismiss"); onClose(); }}
              className="px-4 py-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            >
              Dismiss
            </button>
          )}

          {isDismissed && (
            <button
              onClick={() => onAction(job.id, "undismiss")}
              className="px-4 py-2.5 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
            >
              Restore
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
