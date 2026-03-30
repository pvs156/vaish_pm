/**
 * Ashby connector — queries the Ashby public posting REST API for a curated
 * list of companies.
 *
 * API: GET https://api.ashbyhq.com/posting-api/job-board/{slug}
 * Returns: { jobs: [...] }
 *
 * We filter to PM-adjacent intern roles by title keyword matching.
 */

import { AshbyResponseSchema } from "../schemas";
import type { SourceConnector } from "./types";
import type { ConnectorResult, IngestionError, WorkModel } from "../types";
import { generateDedupeKey, inferWorkModel, normalizeLocations } from "../ingestion/normalize";
import { parseDate } from "../utils/dates";
import { containsAny } from "../utils/text";

const DEFAULT_COMPANIES: Array<{ slug: string; name: string }> = [
  // Product analytics / infra
  { slug: "posthog", name: "PostHog" },
  // Climate / sustainability
  { slug: "watershed", name: "Watershed" },
  // General tech
  { slug: "linear", name: "Linear" },
  { slug: "vanta", name: "Vanta" },
  { slug: "ashby", name: "Ashby" },
  { slug: "loom", name: "Loom" },
  { slug: "retool", name: "Retool" },
  // Fintech
  { slug: "mercury", name: "Mercury" },
  { slug: "ramp", name: "Ramp" },
];

const PM_TITLE_KEYWORDS = [
  "product manager",
  "product management",
  "program manager",
  "apm",
  "associate product",
  "product operations",
  "product analyst",
  "product owner",
  "technical product",
];

const INTERNSHIP_KEYWORDS = ["intern", "internship", "co-op", "summer"];

function isPmInternRole(title: string, employmentType?: string | null): boolean {
  const lower = title.toLowerCase();
  const isIntern =
    containsAny(lower, INTERNSHIP_KEYWORDS) ||
    (employmentType?.toLowerCase().includes("intern") ?? false);
  return containsAny(lower, PM_TITLE_KEYWORDS) && isIntern;
}

function getCompanyList(): Array<{ slug: string; name: string }> {
  const envSlugs = process.env.ASHBY_COMPANIES;
  if (!envSlugs) return DEFAULT_COMPANIES;
  return envSlugs.split(",").map((s) => ({ slug: s.trim(), name: s.trim() }));
}

function ashbyWorkModel(
  workplaceType: string | null | undefined,
  isRemote: boolean | null | undefined,
  locationName: string | null | undefined
): WorkModel {
  if (isRemote) return "remote";
  switch (workplaceType?.toLowerCase()) {
    case "remote":
      return "remote";
    case "hybrid":
      return "hybrid";
    case "onsite":
    case "on_site":
    case "in-office":
      return "onsite";
  }
  return inferWorkModel(locationName);
}

export class AshbyConnector implements SourceConnector {
  readonly sourceId = "ashby" as const;
  readonly displayName = "Ashby Boards";

  async run(): Promise<ConnectorResult> {
    const fetchedAt = new Date();
    const errors: IngestionError[] = [];
    const jobs: ConnectorResult["jobs"] = [];
    const companies = getCompanyList();

    await Promise.allSettled(
      companies.map(async ({ slug, name }) => {
        const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}`;
        let json: unknown;

        try {
          const res = await fetch(url, { cache: "no-store" });

          if (!res.ok) {
            errors.push({
              source: this.sourceId,
              stage: "fetch",
              message: `Ashby ${slug}: HTTP ${res.status}`,
            });
            return;
          }
          json = await res.json();
        } catch (err) {
          errors.push({
            source: this.sourceId,
            stage: "fetch",
            message: `Ashby ${slug}: ${err instanceof Error ? err.message : String(err)}`,
          });
          return;
        }

        let parsed: ReturnType<typeof AshbyResponseSchema.parse>;
        try {
          parsed = AshbyResponseSchema.parse(json);
        } catch (err) {
          errors.push({
            source: this.sourceId,
            stage: "parse",
            message: `Ashby ${slug}: schema parse failed — ${err instanceof Error ? err.message : String(err)}`,
          });
          return;
        }

        for (const posting of parsed.jobs) {
          try {
            if (!isPmInternRole(posting.title, posting.employmentType)) continue;

            const rawLocation = posting.location;
            const locations = normalizeLocations(rawLocation);
            const workModel = ashbyWorkModel(posting.workplaceType, posting.isRemote, rawLocation);
            const postedAt = parseDate(posting.publishedAt);

            const jobUrl =
              posting.jobUrl ??
              `https://jobs.ashbyhq.com/${slug}/${posting.id}`;
            const applyUrl = posting.applyUrl ?? jobUrl;

            const dedupeKey = generateDedupeKey(name, posting.title, locations);

            jobs.push({
              source: this.sourceId,
              sourceJobId: posting.id,
              sourceUrl: jobUrl,
              applyUrl,
              company: name,
              title: posting.title,
              locations,
              workModel,
              description: null,
              postedAt,
              updatedAt: null,
              active: true,
              dedupeKey,
            });
          } catch (err) {
            errors.push({
              source: this.sourceId,
              stage: "normalize",
              message: `Ashby ${slug} posting ${posting.id}: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        }
      })
    );

    return { jobs, errors, fetchedAt };
  }
}
