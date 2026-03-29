# Job Radar

A private personal web app that pulls PM internship / early-career roles from multiple public sources, deduplicates and scores them against your profile, and surfaces the best matches in a clean dashboard.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Database | Neon Serverless Postgres |
| ORM | Drizzle ORM |
| Validation | Zod |
| Tests | Vitest |
| Deployment | Vercel |

---

## Quick start (local)

### 1. Clone and install

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in at minimum:

```
DATABASE_URL=postgres://...   # your Neon connection string
INGEST_SECRET=any-random-string
```

### 3. Create the Neon database

1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. Copy the connection string (pooled) into `DATABASE_URL`.
3. Run the migration:

```bash
# Option A — via Drizzle (push schema directly)
npm run db:push

# Option B — run the SQL migration manually in Neon's SQL editor
# Copy-paste contents of migrations/001_initial.sql
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Trigger the first ingestion

Either click the **↻ Refresh** button on the dashboard (you'll be prompted for the `INGEST_SECRET`), or run:

```bash
npm run ingest
```

---

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Add environment variables in the Vercel dashboard:
   - `DATABASE_URL` — Neon connection string (or use the 1-click Neon integration)
   - `INGEST_SECRET` — random secret for manual ingest trigger
   - `CRON_SECRET` — secret for Vercel cron jobs
   - `OPENAI_API_KEY` *(optional)* — enables GPT-4o-mini ranking boost
   - `GITHUB_TOKEN` *(optional)* — increases GitHub API rate limit from 60 to 5000 req/h
4. Deploy. Vercel will automatically schedule the daily cron (see `vercel.json`).

---

## Running tests

```bash
npm test
```

Tests live in `tests/` and cover:

| File | What it tests |
|---|---|
| `tests/connectors/jobright.test.ts` | Markdown table parser, sub-row handling |
| `tests/ingestion/dedupe.test.ts` | Source priority, postedAt ordering |
| `tests/ingestion/normalize.test.ts` | Work model inference, location splitting, dedupeKey stability |
| `tests/ranking/engine.test.ts` | Score range, empty profile → null, recency decay, mismatch penalty |

---

## Adding a new job source

1. Create `lib/connectors/my-source.ts` implementing `SourceConnector`:

```ts
import type { SourceConnector } from "./types";

export class MySourceConnector implements SourceConnector {
  readonly sourceId = "manual" as const; // or add a new union member in types.ts
  readonly displayName = "My Source";

  async run() {
    // fetch, parse, normalize → return { jobs, errors }
  }
}
```

2. Add your connector to `ALL_CONNECTORS` in `lib/ingestion/pipeline.ts`.

---

## Environment variables reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon Postgres connection string |
| `INGEST_SECRET` | ✅ | Bearer secret for POST /api/ingest |
| `CRON_SECRET` | ✅ (Vercel) | Secret for the Vercel cron GET /api/ingest |
| `OPENAI_API_KEY` | optional | GPT-4o-mini ranking boost (±15 pts) |
| `GITHUB_TOKEN` | optional | Higher GitHub API rate limit |
| `GREENHOUSE_COMPANIES` | optional | Comma-separated extra Greenhouse slugs |
| `LEVER_COMPANIES` | optional | Comma-separated extra Lever slugs |
| `ASHBY_COMPANIES` | optional | Comma-separated extra Ashby slugs |
