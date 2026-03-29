/**
 * SimplifyJobs connector ââ parses the Summer2026-Internships GitHub repo.
 *
 * The README uses an HTML <table> embedded in markdown with columns:
 *   Company | Role | Location | Application / Link | Date Posted
 * Sub-rows (additional roles at same company) start with â³ in the Role column.
 * The Application column contains HTML with anchor tags to Apply/Simplify.
 *
 * Source: https://github.com/SimplifyJobs/Summer2026-Internships (dev branch)
 * We filter to Product Management roles by scanning for PM-related titles.
 */

import * as cheerio from "cheerio";
import type { SourceConnector } from "./types";
import type { ConnectorResult, IngestionError } from "../types";
import { fetchGitHubFile } from "./github-markdown";
import { generateDedupeKey, inferWorkModel, normalizeLocations } from "../ingestion/normalize";
import { parseDate } from "../utils/dates";
import { cleanText } from "../utils/text";
import { extractUrl, isValidUrl } from "../utils/url";

const OWNER = "SimplifyJobs";
const REPO = "Summer2026-Internships";
const PATH = "README.md";
const REF = "dev";

const SOURCE_BASE_URL = `https://github.com/${OWNER}/${REPO}`;

// Roles to keep ââ must match these PM-adjacent keywords
const PM_TITLE_KEYWORDS = [
  "product manager",
  "product management",
  "program manager",
  "program management",
  "project manager",
  "project management",
  "apm",
  "associate product",
  "product operations",
  "product analyst",
  "product strategy",
  "technical product",
  "product owner",
];

function isPmRole(title: string): boolean {
  const lower = title.toLowerCase();
  return PM_TITLE_KEYWORDS.some((kw) => lower.includes(kw));
}

interface ParsedRow {
  company: string;
  title: string;
  location: string;
  applyUrl: string | null;
  dateStr: string;
}

/**
 * Parse the HTML table in the SimplifyJobs README.
 * cheerio handles the embedded HTML <table> inside the markdown file.
 */
export function parseSimplifyJobsReadme(content: string): ParsedRow[] {
  const $ = cheerio.load(content);
  const rows: ParsedRow[] = [];
  let lastCompany = "";

  // Find the PM section by looking for a heading containing "Product Management"
  // then grab the next table
  let targetTable = $("table").first(); // fallback: use first table

  $("h2, h3").each((_, el) => {
    const heading = $(el).text();
    if (/product management/i.test(heading)) {
      const nextTable = $(el).nextAll("table").first();
      if (nextTable.length) {
        targetTable = nextTable;
        return false; // break
      }
    }
  });

  targetTable.find("tr").each((idx, row) => {
    if (idx === 0) return; // skip header

    const cells = $(row).find("td");
    if (cells.length < 4) return;

    const rawCompany = $(cells[0]).text().trim();
    const rawRole = $(cells[1]).text().trim();
    const rawLocation = $(cells[2]).text().trim();
    const rawApplication = $(cells[3]).html() ?? "";
    const rawDate = $(cells[4])?.text().trim() ?? "";

    // Resolve company for â³ sub-rows
    let company: string;
    if (!rawCompany || rawCompany === "â³") {
      company = lastCompany;
    } else {
      company = cleanText(rawCompany);
      lastCompany = company;
    }

    const title = cleanText(rawRole.replace(/^â³\s*/, ""));

    if (!company || !title) return;
    if (!isPmRole(title)) return;

    // Extract apply URL ââ prefer the direct "Apply" link over the Simplify button
    const applyUrl =
      extractUrl(rawApplication) ??
      null;

    rows.push({
      company,
      title,
      location: rawLocation,
      applyUrl,
      dateStr: rawDate,
    });
  });

  return rows;
}

export class SimplifyJobsConnector implements SourceConnector {
  readonly sourceId = "simplifyjobs_github" as const;
  readonly displayName = "SimplifyJobs GitHub Repo";

  async run(): Promise<ConnectorResult> {
    const fetchedAt = new Date();
    const errors: IngestionError[] = [];
    let content: string;

    try {
      content = await fetchGitHubFile(OWNER, REPO, PATH, REF);
    } catch (err) {
      errors.push({
        source: this.sourceId,
        stage: "fetch",
        message: `Failed to fetch README: ${err instanceof Error ? err.message : String(err)}`,
      });
      return { jobs: [], errors, fetchedAt };
    }

    let rows: ParsedRow[];
    try {
      rows = parseSimplifyJobsReadme(content);
    } catch (err) {
      errors.push({
        source: this.sourceId,
        stage: "parse",
        message: `HTML parse failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      return { jobs: [], errors, fetchedAt };
    }

    const jobs: ConnectorResult["jobs"] = [];

    for (const row of rows) {
      try {
        const locations = normalizeLocations(row.location);
        const workModel = inferWorkModel(row.location);
        const postedAt = parseDate(row.dateStr);
        const dedupeKey = generateDedupeKey(row.company, row.title, locations);

        const applyUrl =
          row.applyUrl && isValidUrl(row.applyUrl)
            ? row.applyUrl
            : SOURCE_BASE_URL;

        jobs.push({
          source: this.sourceId,
          sourceJobId: dedupeKey,
          sourceUrl: SOURCE_BASE_URL,
          applyUrl,
          company: row.company,
          title: row.title,
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
          message: `Failed to normalize row: ${err instanceof Error ? err.message : String(err)}`,
          raw: JSON.stringify(row),
        });
      }
    }

    return { jobs, errors, fetchedAt };
  }
}
