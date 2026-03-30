/**
 * seed-resume.ts
 *
 * Reads the PDF resume from ./resume/, extracts text, runs heuristic extraction,
 * and upserts the result into the database as the active user profile.
 *
 * Run with:
 *   node --env-file=.env.local --import=tsx scripts/seed-resume.ts
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// pdf-parse is a CommonJS module; use createRequire for ESM/tsx compatibility
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
import { extractProfileFromResume } from "../lib/profile/extract";
import { upsertProfile } from "../lib/db/queries/profile";

const RESUME_DIR = path.join(process.cwd(), "resume");

async function main() {
  // Find the first PDF in the resume/ folder
  const files = fs.readdirSync(RESUME_DIR).filter((f) => f.endsWith(".pdf"));
  if (files.length === 0) {
    console.error("No PDF found in ./resume/ directory.");
    process.exit(1);
  }

  const pdfPath = path.join(RESUME_DIR, files[0]!);
  console.log(`Reading resume: ${files[0]}`);

  const buffer = fs.readFileSync(pdfPath);
  const { text } = await pdfParse(buffer);

  if (!text.trim()) {
    console.error("PDF parsed but no text extracted. Is the PDF text-based (not scanned)?");
    process.exit(1);
  }

  console.log(`Extracted ${text.length} characters of text.`);
  console.log("\nRunning heuristic extraction…");

  const extracted = extractProfileFromResume(text);

  console.log("\nExtracted fields:");
  console.log("  Titles:    ", extracted.preferredTitles?.join(", ") || "(none)");
  console.log("  Skills:    ", extracted.preferredSkills?.join(", ") || "(none)");
  console.log("  Locations: ", extracted.preferredLocations?.join(", ") || "(none)");
  console.log("  Work model:", extracted.preferredWorkModel?.join(", ") || "(none)");

  console.log("\nUpserting profile into database…");

  const profile = await upsertProfile({
    resumeText: text,
    preferredTitles: extracted.preferredTitles ?? [],
    preferredSkills: extracted.preferredSkills ?? [],
    preferredLocations: extracted.preferredLocations ?? [],
    preferredWorkModel: extracted.preferredWorkModel ?? [],
  });

  console.log(`\nProfile saved (id: ${profile.id})`);
  console.log("Done! Jobs will be rescored on next ingest or when you visit /settings and save.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
