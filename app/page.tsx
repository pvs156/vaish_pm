import { queryJobs } from "@/lib/db/queries/jobs";
import { Dashboard } from "@/components/dashboard/Dashboard";
import type { JobListItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let initialJobs: JobListItem[] = [];
  let initialTotal = 0;

  try {
    const result = await queryJobs(
      { window: "48h", sort: "best_fit", source: "all", workModel: "all", location: "", minScore: 0, includeApplied: true, includeDismissed: false },
      1,
      25
    );
    initialJobs = result.jobs as JobListItem[];
    initialTotal = result.total;
  } catch {
    // DB not yet connected — show empty state, user can trigger ingest
  }

  return (
    <Dashboard
      initialJobs={initialJobs}
      initialTotal={initialTotal}
      initialFilters={{ window: "48h", sort: "best_fit" }}
    />
  );
}
