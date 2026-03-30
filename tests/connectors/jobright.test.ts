import { describe, it, expect } from "vitest";
import { parseJobrightMarkdown } from "@/lib/connectors/jobright";

const BASIC_TABLE = `
| Company | Role | Location | Work Type | Date |
| ------- | ---- | -------- | --------- | ---- |
| [Stripe](https://stripe.com) | [PM Intern](https://jobs.stripe.com/123) | San Francisco, CA | Hybrid | Mar 28 |
| Meta | [APM Intern](https://meta.com/jobs/456) | Menlo Park, CA | Onsite | Mar 29 |
`;

const SUBROW_TABLE = `
| Company | Role | Location | Work Type | Date |
| ------- | ---- | -------- | --------- | ---- |
| [Google](https://google.com) | [PM Intern â“ Ads](https://google.com/jobs/1) | Mountain View | Remote | Apr 1 |
| ↳ | [PM Intern â“ Maps](https://google.com/jobs/2) | Seattle | Hybrid | Apr 2 |
| ↳ | [PM Intern â“ Cloud](https://google.com/jobs/3) | Remote | Remote | Apr 3 |
| [Figma](https://figma.com) | [Product Intern](https://figma.com/jobs/4) | San Francisco | Hybrid | Apr 4 |
`;

const MALFORMED_TABLE = `
| Company | Role | Location | Work Type | Date |
| ------- | ---- | -------- | --------- | ---- |
| | | | | |
| Acme Corp | PM Intern | New York | Onsite | Apr 5 |
|   |   |   |   |
`;

describe("parseJobrightMarkdown", () => {
  it("parses a basic two-row table", () => {
    const rows = parseJobrightMarkdown(BASIC_TABLE);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.company).toBe("Stripe");
    expect(rows[0]!.title).toBe("PM Intern");
    expect(rows[0]!.location).toBe("San Francisco, CA");
    expect(rows[0]!.applyUrl).toBe("https://jobs.stripe.com/123");
    expect(rows[1]!.company).toBe("Meta");
    expect(rows[1]!.title).toBe("APM Intern");
  });

  it("carries over company name for ↳ sub-rows", () => {
    const rows = parseJobrightMarkdown(SUBROW_TABLE);
    expect(rows).toHaveLength(4);
    // All three Google sub-rows should have company = "Google"
    expect(rows[0]!.company).toBe("Google");
    expect(rows[1]!.company).toBe("Google");
    expect(rows[2]!.company).toBe("Google");
    expect(rows[3]!.company).toBe("Figma");
  });

  it("extracts correct apply URL for each sub-row", () => {
    const rows = parseJobrightMarkdown(SUBROW_TABLE);
    expect(rows[0]!.applyUrl).toBe("https://google.com/jobs/1");
    expect(rows[1]!.applyUrl).toBe("https://google.com/jobs/2");
    expect(rows[2]!.applyUrl).toBe("https://google.com/jobs/3");
    expect(rows[3]!.applyUrl).toBe("https://figma.com/jobs/4");
  });

  it("skips rows with empty company and title", () => {
    const rows = parseJobrightMarkdown(MALFORMED_TABLE);
    // Only the Acme Corp row should survive (all-empty rows are skipped)
    const acme = rows.find((r) => r.company === "Acme Corp");
    expect(acme).toBeDefined();
    expect(acme!.title).toBe("PM Intern");
  });

  it("returns empty array for content with no table", () => {
    const rows = parseJobrightMarkdown("# Just a heading\n\nSome text without a table.");
    expect(rows).toHaveLength(0);
  });
});
