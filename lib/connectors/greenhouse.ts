/**
 * Greenhouse connector ââ queries public Greenhouse job boards for a curated list of companies.
 *
 * API: GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs
 * Returns: { jobs: [...], meta: { total: N } }
 *
 * We filter to PM-adjacent roles by title keyword matching.
 * Company list lives in GREENHOUSE_COMPANIES (expandable via env).
 */

import { GreenhouseResponseSchema } from "../schemas";
import type { SourceConnector } from "./types";
import type { ConnectorResult, IngestionError } from "../types";
import { generateDedupeKey, inferWorkModel, normalizeLocations } from "../ingestion/normalize";
import { parseDate } from "../utils/dates";
import { containsAny, normalizeCompany } from "../utils/text";

// Default curated list ââ expandable via GREENHOUSE_COMPANIES env var (comma-separated tokens)
const DEFAULT_COMPANIES: Array<{ token: string; name: string }> = [
  { token: "stripe", name: "Stripe" },
  { token: "figma", name: "Figma" },
  { token: "ramp", name: "Ramp" },
  { token: "brex", name: "Brex" },
  { token: "rippling", name: "Rippling" },
  { token: "anthropic", name: "Anthropic" },
  { token: "scaleai", name: "Scale AI" },
  { token: "duolingo", name: "Duolingo" },
  { token: "airtable", name: "Airtable" },
  { token: "notion", name: "Notion" },
  { token: "mixpanel", name: "Mixpanel" },
  { token: "gusto", name: "Gusto" },
];

const PM_TITLE_KEYWORDS = [
  "product manager",
  "product management",
  "program manager",
  "program management",
  "project manager",
  "apm",
  "associate product",
  "product operations",
  "product analyst",
  "product owner",
  "technical product",
];

const INTERNSHIP_KEYWORDS = ["intern", "internship", "co-op", "coop", "summer"];

function isPmInternRole(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    containsAny(lower, PM_TITLE_KEYWORDS) &&
    containsAny(lower, INTERNSHIP_KEYWORDS)
  );
}

function getCompanyList(): Array<{ token: string; name: string }> {
  const envTokens = process.env.GREENHOUSE_COMPANIES;
  if (!envTokens) return DEFAULT_COMPANIES;
  return envTokens.split(",").map((t) => ({ token: t.trim(), name: t.trim() }));
}

export class GreenhouseConnector implements SourceConnector {
  readonly sourceId = "greenhouse" as const;
  readonly displayName = "Greenhouse Boards";

  async run(): Promise<ConnectorResult> {
    const fetchedAt = new Date();
    const errors: IngestionError[] = [];
    const jobs: ConnectorResult["jobs"] = [];
    const companies = getCompanyList();

    await Promise.allSettled(
      companies.map(async ({ token, name }) => {
        const url = `https://boards-api.greenhouse.io/v1/boards/${token}/jobs`;
        let json: unknown;

        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) {
            errors.push({
              source: this.sourceId,
              stage: "fetch",
              message: `Greenhouse ${token}: HTTP ${res.status}`,
            });
            return;
          }
          json = await res.json();
        } catch (err) {
          errors.push({
            source: this.sourceId,
            stage: "fetch",
            message: `Greenhouse ${token}: ${err instanceof Error ? err.message : String(err)}`,
          });
          return;
        }

        let parsed: ReturnType<typeof GreenhouseResponseSchema.parse>;
        try {
          parsed = GreenhouseResponseSchema.parse(json);
        } catch (err) {
          errors.push({
            source: this.sourceId,
            stage: "parse",
            message: `Greenhouse ${token}: schema parse failed ââ ${err instanceof Error ? err.message : String(err)}`,
          });
          return;
        }

        for (const ghJob of parsed.jobs) {
          try {
            if (!isPmInternRole(ghJob.title)) continue;

            const company = ghJob.company_name ?? name;
            const locations = normalizeLocations(ghJob.location.name);
            const workModel = inferWorkModel(ghJob.location.name);
            const postedAt = parseDate(ghJob.first_published ?? null) ?? parseDate(ghJob.updated_at);
            const dedupeKey = generateDedupeKey(company, ghJob.title, locations);

            jobs.push({
              source: this.sourceId,
              sourceJobId: String(ghJob.id),
              sourceUrl: ghJob.absolute_url,
              applyUrl: ghJob.absolute_url,
              company,
              title: ghJob.title,
              locations,
              workModel,
              description: null,
              postedAt,
              updatedAt: parseDate(ghJob.updated_at),
              active: true,
              dedupeKey,
            });
          } catch (err) {
            errors.push({
              source: this.sourceId,
              stage: "normalize",
              message: `Greenhouse ${token} job ${ghJob.id}: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        }
      })
    );

    return { jobs, errors, fetchedAt };
  }
}
