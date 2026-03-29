// dedupe.test operates on ConnectorResult["jobs"] shape (not full JobPosting)
import { describe, it, expect } from "vitest";
import { deduplicateJobs } from "@/lib/ingestion/dedupe";
import type { ConnectorResult } from "@/lib/types";

type RawJob = ConnectorResult["jobs"][number];

function makeJob(overrides: Partial<RawJob> & { source?: RawJob["source"] }): RawJob {
  return {
    source: overrides.source ?? "greenhouse",
    sourceJobId: "123",
    dedupeKey: "company::pm-intern::sf::abc",
    title: "PM Intern",
    company: "Acme",
    locations: ["San Francisco, CA"],
    workModel: "hybrid",
    applyUrl: "https://example.com/apply",
    sourceUrl: "https://example.com",
    postedAt: new Date("2024-03-01T00:00:00Z"),
    updatedAt: null,
    description: null,
    active: true,
    ...overrides,
  };
}

describe("deduplicateJobs", () => {
  it("passes through unique jobs unchanged", () => {
    const jobs = [
      makeJob({ dedupeKey: "a::b::c::1", source: "greenhouse" }),
      makeJob({ dedupeKey: "d::e::f::2", source: "lever" }),
    ];
    expect(deduplicateJobs(jobs)).toHaveLength(2);
  });

  it("deduplicates jobs with the same dedupeKey ââ higher priority source wins", () => {
    const jobs = [
      makeJob({ dedupeKey: "same-key", source: "jobright_github" }),
      makeJob({ dedupeKey: "same-key", source: "greenhouse" }), // higher priority
    ];
    const result = deduplicateJobs(jobs);
    expect(result).toHaveLength(1);
    expect(result[0]!.source).toBe("greenhouse");
  });

  it("when same priority, prefers earlier postedAt", () => {
    const jobs = [
      makeJob({
        dedupeKey: "same-key",
        source: "greenhouse",
        postedAt: new Date("2024-03-10"),
      }),
      makeJob({
        dedupeKey: "same-key",
        source: "lever",
        postedAt: new Date("2024-03-01"), // earlier
      }),
    ];
    const result = deduplicateJobs(jobs);
    expect(result).toHaveLength(1);
    expect(result[0]!.postedAt?.toISOString()).toBe("2024-03-01T00:00:00.000Z");
  });

  it("keeps the first seen job when both priority and postedAt are equal", () => {
    const jobs = [
      makeJob({ dedupeKey: "same-key", source: "greenhouse", sourceJobId: "first" }),
      makeJob({ dedupeKey: "same-key", source: "greenhouse", sourceJobId: "second" }),
    ];
    const result = deduplicateJobs(jobs);
    expect(result).toHaveLength(1);
    expect(result[0]!.sourceJobId).toBe("first");
  });

  it("handles an empty array", () => {
    expect(deduplicateJobs([])).toHaveLength(0);
  });
});
