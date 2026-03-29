// engine.test works with the RawJob type (ConnectorResult["jobs"][number])
import { describe, it, expect } from "vitest";
import { scoreJob } from "@/lib/ranking/engine";
import type { UserProfile, ConnectorResult } from "@/lib/types";

type RawJob = ConnectorResult["jobs"][number];

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "default",
    resumeText: null,
    preferredTitles: ["PM Intern", "APM"],
    preferredSkills: ["analytics", "roadmapping", "SQL"],
    preferredLocations: ["San Francisco", "Remote"],
    preferredWorkModel: ["hybrid", "remote"],
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeJob(overrides: Partial<RawJob> = {}): RawJob {
  return {
    source: "greenhouse",
    sourceJobId: "123",
    dedupeKey: "stripe::pm-intern::sf::abc",
    title: "Product Manager Intern",
    company: "Stripe",
    locations: ["San Francisco, CA"],
    workModel: "hybrid",
    applyUrl: "https://stripe.com/jobs/123",
    sourceUrl: "https://stripe.com/jobs/123",
    postedAt: new Date(), // today
    updatedAt: null,
    active: true,
    description: null,
    ...overrides,
  };
}

describe("scoreJob", () => {
  it("returns null score for an empty profile", () => {
    const result = scoreJob(makeJob(), {
      id: "default",
      resumeText: null,
      preferredTitles: [],
      preferredSkills: [],
      preferredLocations: [],
      preferredWorkModel: [],
      updatedAt: new Date(),
    });
    expect(result.score).toBeNull();
    expect(result.reasons).toHaveLength(0);
  });

  it("returns a score in range [0, 100] for a populated profile", () => {
    const result = scoreJob(makeJob(), makeProfile());
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThanOrEqual(0);
    expect(result.score!).toBeLessThanOrEqual(100);
  });

  it("gives a high score to a perfect PM intern match", () => {
    const result = scoreJob(makeJob(), makeProfile());
    // Should score at least 60 for a good PM intern role in preferred location
    expect(result.score!).toBeGreaterThanOrEqual(60);
  });

  it("gives a low score to a senior or non-PM role", () => {
    const result = scoreJob(
      makeJob({ title: "Senior Software Engineer" }),
      makeProfile()
    );
    // Should score much lower — title mismatch + mismatch penalty
    expect(result.score!).toBeLessThan(50);
  });

  it("includes reasons array with at least one entry", () => {
    const result = scoreJob(makeJob(), makeProfile());
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("returns an explanation string", () => {
    const result = scoreJob(makeJob(), makeProfile());
    expect(typeof result.explanation).toBe("string");
    expect(result.explanation!.length).toBeGreaterThan(0);
  });

  it("uses recency — an old job scores lower than a fresh one", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

    const freshResult = scoreJob(makeJob({ postedAt: new Date() }), makeProfile());
    const staleResult = scoreJob(makeJob({ postedAt: oldDate }), makeProfile());

    expect(freshResult.score!).toBeGreaterThan(staleResult.score!);
  });
});
