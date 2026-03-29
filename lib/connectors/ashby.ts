/**
 * Ashby connector â” queries public Ashby GraphQL job boards for a curated list of companies.
 *
 * API: POST https://jobs.ashbyhq.com/api/non-user-graphql
 * with GraphQL query: query JobBoard($slug: String!) { jobBoard(companySlug: $slug) { ... } }
 *
 * We filter to PM-adjacent roles by title keyword matching.
 */

import { AshbyResponseSchema } from "../schemas";
import type { SourceConnector } from "./types";
import type { ConnectorResult, IngestionError, WorkModel } from "../types";
import { generateDedupeKey, inferWorkModel, normalizeLocations } from "../ingestion/normalize";
import { parseDate } from "../utils/dates";
import { containsAny } from "../utils/text";

const DEFAULT_COMPANIES: Array<{ slug: string; name: string }> = [
  { slug: "linear", name: "Linear" },
  { slug: "retool", name: "Retool" },
  { slug: "loom", name: "Loom" },
  { slug: "ashby", name: "Ashby" },
  { slug: "vanta", name: "Vanta" },
  { slug: "dbt-labs", name: "dbt Labs" },
  { slug: "watershed", name: "Watershed" },
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

const ASHBY_GRAPHQL_QUERY = `
  query JobBoard($slug: String!) {
    jobBoard(companySlug: $slug) {
      jobPostings {
        id
        title
        locationName
        employmentType
        jobUrl
        publishedAt
        isRemote
        department {
          name
        }
      }
    }
  }
`;

function getCompanyList(): Array<{ slug: string; name: string }> {
  const envSlugs = process.env.ASHBY_COMPANIES;
  if (!envSlugs) return DEFAULT_COMPANIES;
  return envSlugs.split(",").map((s) => ({ slug: s.trim(), name: s.trim() }));
}

function ashbyWorkModelFromFields(
  isRemote: boolean | null | undefined,
  locationName: string | null | undefined
): WorkModel {
  if (isRemote) return "remote";
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
        let json: unknown;

        try {
          const res = await fetch(
            "https://jobs.ashbyhq.com/api/non-user-graphql",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: ASHBY_GRAPHQL_QUERY,
                variables: { slug },
              }),
              cache: "no-store",
            }
          );

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
            message: `Ashby ${slug}: schema parse failed â” ${err instanceof Error ? err.message : String(err)}`,
          });
          return;
        }

        const postings = parsed.data.jobBoard.jobPostings;

        for (const posting of postings) {
          try {
            if (!isPmInternRole(posting.title, posting.employmentType)) continue;

            const locations = normalizeLocations(posting.locationName);
            const workModel = ashbyWorkModelFromFields(posting.isRemote, posting.locationName);
            const postedAt = parseDate(posting.publishedAt);

            // Ashby job URLs follow a pattern when not returned directly
            const jobUrl =
              posting.jobUrl ??
              `https://jobs.ashbyhq.com/${slug}/${posting.id}`;

            const dedupeKey = generateDedupeKey(name, posting.title, locations);

            jobs.push({
              source: this.sourceId,
              sourceJobId: posting.id,
              sourceUrl: jobUrl,
              applyUrl: jobUrl,
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
