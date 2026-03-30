"use client";

import { useState, useCallback, useRef } from "react";
import type { JobListItem, JobFilters } from "@/lib/types";
import { FilterBar } from "./FilterBar";
import { JobCard } from "./JobCard";
import { JobDetailModal } from "./JobDetailModal";

interface DashboardProps {
  initialJobs: JobListItem[];
  initialTotal: number;
  initialFilters?: Partial<JobFilters>;
}

const DEFAULT_FILTERS: JobFilters = {
  window: "48h",
  sort: "best_fit",
  source: "all",
  workModel: "all",
  location: "",
  minScore: 0,
  includeDismissed: false,
  includeApplied: true,
};

export function Dashboard({ initialJobs, initialTotal, initialFilters }: DashboardProps) {
  const [filters, setFilters] = useState<JobFilters>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [jobs, setJobs] = useState<JobListItem[]>(initialJobs);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialJobs.length < initialTotal);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobListItem | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [ingestMessage, setIngestMessage] = useState<string | null>(null);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const buildQuery = useCallback((f: JobFilters, pg: number) => {
    const params = new URLSearchParams();
    params.set("page", String(pg));
    params.set("window", f.window);
    params.set("sort", f.sort);
    params.set("source", f.source);
    params.set("workModel", f.workModel);
    if (f.location) params.set("location", f.location);
    if (f.minScore > 0) params.set("minScore", String(f.minScore));
    if (f.includeDismissed) params.set("includeDismissed", "true");
    if (f.includeApplied) params.set("includeApplied", "true");
    return `/api/jobs?${params.toString()}`;
  }, []);

  const fetchJobs = useCallback(
    async (newFilters: JobFilters) => {
      setLoading(true);
      setPage(1);
      try {
        const res = await fetch(buildQuery(newFilters, 1));
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        setJobs(data.jobs);
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [buildQuery]
  );

  const handleFilterChange = useCallback(
    (updated: JobFilters) => {
      setFilters(updated);
      fetchJobs(updated);
    },
    [fetchJobs]
  );

  const loadMore = useCallback(async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetch(buildQuery(filtersRef.current, nextPage));
      if (!res.ok) throw new Error("Failed to load more jobs");
      const data = await res.json();
      setJobs((prev) => [...prev, ...data.jobs]);
      setHasMore(data.hasMore);
      setPage(nextPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, buildQuery]);

  const handleAction = useCallback(
    async (
      jobId: string,
      action: "save" | "dismiss" | "apply" | "unsave" | "undismiss"
    ) => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) throw new Error("Action failed");

        type UserStatus = JobListItem["userStatus"];
        const statusMap: Record<string, UserStatus> = {
          save: "saved",
          unsave: null,
          apply: "applied",
          dismiss: "dismissed",
          undismiss: null,
        };
        const nextStatus = statusMap[action] ?? null;

        const updater = (j: JobListItem): JobListItem => {
          if (j.id !== jobId) return j;
          return {
            ...j,
            userStatus: nextStatus,
            appliedAt: action === "apply" ? new Date() : j.appliedAt,
            savedAt: action === "save" ? new Date() : action === "unsave" ? null : j.savedAt,
            dismissedAt: action === "dismiss" ? new Date() : action === "undismiss" ? null : j.dismissedAt,
          };
        };

        setJobs((prev) => prev.map(updater));
        setSelectedJob((prev) => (prev ? updater(prev) : null));
      } catch (err) {
        console.error(err);
      }
    },
    []
  );

  const triggerIngest = useCallback(async () => {
    setIngestLoading(true);
    setIngestMessage(null);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setIngestMessage(`Error: ${data.error ?? "Ingest failed"}`);
      } else {
        setIngestMessage(
          `Refreshed! ${(data.totalInserted ?? 0) + (data.totalUpdated ?? 0)} jobs updated.`
        );
        await fetchJobs(filtersRef.current);
      }
    } catch {
      setIngestMessage("Network error -- refresh failed.");
    } finally {
      setIngestLoading(false);
    }
  }, [fetchJobs]);

  return (
    <div className="min-h-screen" style={{background:"#fafaf9"}}>
      {/* Sticky filter bar */}
      <div className="sticky top-14 z-20 bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto">
          <FilterBar filters={filters} onChange={handleFilterChange} isLoading={loading} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Summary + refresh row */}
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-stone-800 tracking-tight">
              PM Internship Roles
            </h1>
            <p className="text-[12px] text-stone-400 mt-0.5">
              {loading
                ? "Loading…"
                : `${total} role${total !== 1 ? "s" : ""}`}
              {jobs.length < total && !loading ? ` · showing ${jobs.length}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {ingestMessage && (
              <span className="text-[12px] text-stone-500">{ingestMessage}</span>
            )}
            <button
              onClick={triggerIngest}
              disabled={ingestLoading}
              className="text-[12px] font-medium px-3 py-1.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300 disabled:opacity-50 transition-colors"
            >
              {ingestLoading ? "Refreshing…" : "↻ Refresh jobs"}
            </button>
          </div>
        </div>

        {/* Job list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-lg border border-stone-100 animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <p className="text-3xl opacity-30">&#x25A1;</p>
            <p className="text-sm font-medium text-stone-600">No roles found</p>
            <p className="text-[13px] text-stone-400">
              Try wider filters, or{" "}
              <button onClick={triggerIngest} className="text-brand-600 hover:underline">
                refresh listings
              </button>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onAction={handleAction}
                onExpand={setSelectedJob}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="flex justify-center mt-8">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-[13px] font-medium px-6 py-2 rounded border border-stone-200 text-stone-600 bg-white hover:bg-stone-50 disabled:opacity-50 transition-colors"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <JobDetailModal
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onAction={handleAction}
      />
    </div>
  );
}
