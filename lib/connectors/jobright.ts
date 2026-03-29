/**
 * Jobright connector �” parses the 2026-Product-Management-Internship GitHub repo.
 *
 * The README is a markdown pipe table with columns:
 *   Company | Role | Location | Work Type | Date
 * Sub-rows (additional postings at same company) start with ↳ in the Role column.
 *
 * Source: https://github.com/jobright-ai/2026-Product-Management-Internship
 */

import type { SourceConnector } from "./types";
import type { ConnectorResult, IngestionError } from "../types";
import { fetchGitHubFile } from "./github-markdown";
import { generateDedupeKey, inferWorkModel, normalizeLocations } from "../ingestion/normalize";
import { parseDate } from "../utils/dates";
import { cleanText, normalizeCompany } from "../utils/text";
import { extractUrl, isValidUrl } from "../utils/url";

const OWNER = "jobright-ai";
const REPO = "2026-Product-Management-Internship";
const PATH = "README.md";
const BRANCHES = ["main", "master"];

const SOURCE_BASE_URL = `https://github.com/${OWNER}/${REPO}`;

interface ParsedRow {
  company: string;
  title: string;
  location: string;
  workType: string;
  dateStr: string;
  applyUrl: string | null;
}

/**
 * Parse the markdown pipe table rows from the README content.
 * Handles ↳ sub-rows by carrying over the last seen company name.
 */
export function parseJobrightMarkdown(content: string): ParsedRow[] {
  const lines = content.split("\n");
  const rows: ParsedRow[] = [];
  let inTable = false;
  let headerFound = false;
  let lastCompany = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect table header (contains Company | Role | Location)
    if (!headerFound && /company/i.test(trimmed) && trimmed.startsWith("|")) {
      headerFound = true;
      inTable = true;
      continue;
    }

    if (!inTable) continue;

    // Skip separator row (|---|---|---|)
    if (/^\|[\s\-:]+\|/.test(trimmed)) continue;

    // Empty line or non-table line ends the table
    if (!trimmed.startsWith("|")) {
      if (headerFound && rows.length > 0) break;
      continue;
    }

    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    if (cells.length < 3) continue;

    const [rawCompany = "", rawRole = "", rawLocation = "", rawWorkType = "", rawDate = ""] = cells;

    // Resolve company: use ↳ sub-row or update last seen
    let company: string;
    if (rawCompany.startsWith("↳") || rawCompany === "") {
      company = lastCompany;
    } else {
      company = cleanText(rawCompany.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"));
      lastCompany = company;
    }

    const title = cleanText(rawRole.replace(/↳\s*/, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"));
    const location = cleanText(rawLocation);
    const workType = cleanText(rawWorkType);
    const dateStr = cleanText(rawDate);

    // Extract the apply URL from either the role cell or the company cell
    const applyUrl = extractUrl(rawRole) ?? extractUrl(rawCompany) ?? null;

    if (!company || !title) continue;

    rows.push({ company, title, location, workType, dateStr, applyUrl });
  }

  return rows;
}

export class JobrightConnector implements SourceConnector {
  readonly sourceId = "jobright_github" as const;
  readonly displayName = "Jobright GitHub Repo";

  async run(): Promise<ConnectorResult> {
    const fetchedAt = new Date();
    const errors: IngestionError[] = [];
    let content: string | null = null;

    for (const branch of BRANCHES) {
      try {
        content = await fetchGitHubFile(OWNER, REPO, PATH, branch);
        break;
      } catch (err) {
        // Try next branch
      }
    }

    if (!content) {
      errors.push({
        source: this.sourceId,
        stage: "fetch",
        message: `Failed to fetch README from ${OWNER}/${REPO} (tried branches: ${BRANCHES.join(", ")})`,
      });
      return { jobs: [], errors, fetchedAt };
    }

    let rows: ParsedRow[];
    try {
      rows = parseJobrightMarkdown(content);
    } catch (err) {
      errors.push({
        source: this.sourceId,
        stage: "parse",
        message: `Markdown parse failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      return { jobs: [], errors, fetchedAt };
    }

    const jobs: ConnectorResult["jobs"] = [];

    for (const row of rows) {
      try {
        const locations = normalizeLocations(row.location);
        const workModel = inferWorkModel(row.workType, row.location);
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
          company: normalizeCompany(row.company) ? row.company : row.company,
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
