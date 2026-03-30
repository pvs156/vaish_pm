#!/usr/bin/env tsx
/**
 * CLI ingestion runner -- use when you want to trigger ingest locally.
 * Usage:  npm run ingest
 *
 * Requires DATABASE_URL in your .env.local file.
 */

import { config } from "dotenv";
config({ path: ".env.local" }); // load .env.local before any db imports

import { runIngestionPipeline } from "@/lib/ingestion/pipeline";

async function main() {
  console.log("Vaishnavi Job Board -- starting ingestion...\n");
  const start = Date.now();

  const result = await runIngestionPipeline();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nIngestion finished in ${elapsed}s`);
  console.log(`   Inserted : ${result.totalInserted}`);
  console.log(`   Updated  : ${result.totalUpdated}`);
  console.log(`   Skipped  : ${result.totalSkipped}`);
  console.log(`   Status   : ${result.status}`);

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    for (const err of result.errors) {
      console.log(`   [${err.source}] ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
