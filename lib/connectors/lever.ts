/**
 * Lever connector â” queries public Lever job boards for a curated list of companies.
 *
 * API: GET https://api.lever.co/v0/postings/{company}?mode=json
 * Returns: array of posting objects
 *
 * We filter by commitment === "Internship" and PM-adjacent title keywords.
 */

import { LeverResponseSchema } from "../schemas";
import type { SourceConnector } from "./types";
import type { ConnectorResult, IngestionError, WorkModel } from "../types";
import { generateDedupeKey, inferWorkModel, normalizeLocations } from "../ingestion/normalize";
import { fromUnixMs } from "../utils/dates";
import { containsAny } from "../utils/text";

const DEFAULT_COMPANIES: Array<{ slug: string; name: string }> = [
  { slug: "palantir", name: "Palantir" },
  { slug: "benchling", name: "Benchling" },
  { slug: "thoughtworks", name: "Thoughtworks" },
  { slug: "scale-ai", name: "Scale AI" },
  { slug: "coda", name: "Coda" },
  { slug: "linear", name: "Linear" },
  { slug: "retool", name: "Retool" },
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

function isPmInternRole(title: string, commitment?: string): boolean {
  const lower = title.toLowerCase();
  const isIntern =
    containsAny(lower, INTERNSHIP_KEYWORDS) ||
    commitment?.toLowerCase().includes("intern") === true;
  return containsAny(lower, PM_TITLE_KEYWORDS) && isIntern;
}

function leverWorkplaceToWorkModel(workplaceType?: string): WorkModel {
  switch (workplaceType?.toLowerCase()) {
    case "remote":
      return "remote";
    case "hybrid":
      return "hybrid";
    case "onsite":
    case "in-office":
    case "office":
      return "onsite";
    default:
      return "unknown";
  }
}

function getCompanyList(): Array<{ slug: string; name: string }> {
  const envSlugs = process.env.LEVER_COMPANIES;
  if (!envSlugs) return DEFAULT_COMPANIES;
  return envSlugs.split(",").map((s) => ({ slug: s.trim(), name: s.trim() }));
}

export class LeverConnector implements SourceConnector {
  readonly sourceId = "lever" as const;
  readonly displayName = "Lever Boards";

  async run(): Promise<ConnectorResult> {
    const fetchedAt = new Date();
    const errors: IngestionError[] = [];
    const jobs: ConnectorResult["jobs"] = [];
    const companies = getCompanyList();

    await Promise.allSettled(
      companies.map(async ({ slug, name }) => {
        const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
        let json: unknown;

        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) {
            errors.push({
              source: this.sourceId,
              stage: "fetch",
              message: `Lever ${slug}: HTTP ${res.status}`,
            });
            return;
          }
          json = await res.json();
        } catch (err) {
          errors.push({
            source: this.sourceId,
            stage: "fetch",
            message: `Lever ${slug}: ${err instanceof Error ? err.message : String(err)}`,
          });
          return;
        }

        let postings: ReturnType<typeof LeverResponseSchema.parse>;
        try {
          postings = LeverResponseSchema.parse(json);
        } catch (err) {
          errors.push({
            source: this.sourceId,
            stage: "parse",
            message: `Lever ${slug}: schema parse failed â” ${err instanceof Error ? err.message : String(err)}`,
          });
          return;
        }

        for (const posting of postings) {
          try {
            if (!isPmInternRole(posting.text, posting.categories.commitment)) continue;

            const rawLocations = [
              ...(posting.categories.allLocations ?? []),
              posting.categories.location,
            ].filter((l): l is string => Boolean(l));

            const locations = rawLocations.flatMap((l) => normalizeLocations(l));
            const workModel =
              leverWorkplaceToWorkModel(posting.workplaceType) ??
              inferWorkModel(...rawLocations);

            const postedAt = fromUnixMs(posting.createdAt);
            const dedupeKey = generateDedupeKey(name, posting.text, locations);

            jobs.push({
              source: this.sourceId,
              sourceJobId: posting.id,
              sourceUrl: posting.hostedUrl,
              applyUrl: posting.applyUrl,
              company: name,
              title: posting.text,
              locations,
              workModel,
              description: posting.descriptionPlain ?? null,
              postedAt,
              updatedAt: null,
              active: true,
              dedupeKey,
            });
          } catch (err) {
            errors.push({
              source: this.sourceId,
              stage: "normalize",
              message: `Lever ${slug} posting ${posting.id}: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        }
      })
    );

    return { jobs, errors, fetchedAt };
  }
}
