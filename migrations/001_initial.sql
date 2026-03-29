-- Job Radar — Initial Database Schema
-- Run against your Neon Postgres database
-- Or use: npm run db:push (applies schema directly from Drizzle definitions)

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE work_model AS ENUM ('remote', 'hybrid', 'onsite', 'unknown');

CREATE TYPE source_id AS ENUM (
  'jobright_github',
  'simplifyjobs_github',
  'greenhouse',
  'lever',
  'ashby',
  'manual'
);

CREATE TYPE ingestion_status AS ENUM ('success', 'partial', 'failed');

-- ─── jobs ─────────────────────────────────────────────────────────────────────

CREATE TABLE jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           source_id       NOT NULL,
  source_job_id    TEXT            NOT NULL,
  source_url       TEXT            NOT NULL,
  apply_url        TEXT            NOT NULL,
  company          TEXT            NOT NULL,
  title            TEXT            NOT NULL,
  locations        JSONB           NOT NULL DEFAULT '[]',
  work_model       work_model      NOT NULL DEFAULT 'unknown',
  description      TEXT,
  posted_at        TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  first_seen_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  missed_runs      INTEGER         NOT NULL DEFAULT 0,
  active           BOOLEAN         NOT NULL DEFAULT TRUE,
  dedupe_key       TEXT            NOT NULL UNIQUE,
  fit_score        REAL,
  fit_reasons      JSONB           NOT NULL DEFAULT '[]',
  fit_explanation  TEXT
);

CREATE INDEX jobs_source_idx        ON jobs(source);
CREATE INDEX jobs_posted_at_idx     ON jobs(posted_at DESC);
CREATE INDEX jobs_first_seen_at_idx ON jobs(first_seen_at DESC);
CREATE INDEX jobs_fit_score_idx     ON jobs(fit_score DESC);
CREATE INDEX jobs_active_idx        ON jobs(active);

-- ─── job_sources ──────────────────────────────────────────────────────────────

CREATE TABLE job_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id       source_id   NOT NULL UNIQUE,
  display_name    TEXT        NOT NULL,
  url             TEXT        NOT NULL,
  enabled         BOOLEAN     NOT NULL DEFAULT TRUE,
  last_fetched_at TIMESTAMPTZ,
  config          JSONB       DEFAULT '{}'
);

-- Seed known sources
INSERT INTO job_sources (source_id, display_name, url) VALUES
  ('jobright_github',    'Jobright GitHub Repo',        'https://github.com/jobright-ai/2026-Product-Management-Internship'),
  ('simplifyjobs_github','SimplifyJobs GitHub Repo',    'https://github.com/SimplifyJobs/Summer2026-Internships'),
  ('greenhouse',         'Greenhouse Boards',           'https://boards-api.greenhouse.io/v1/boards'),
  ('lever',              'Lever Boards',                'https://api.lever.co/v0/postings'),
  ('ashby',              'Ashby Boards',                'https://jobs.ashbyhq.com/api/non-user-graphql'),
  ('manual',             'Manual',                      '');

-- ─── user_profile ─────────────────────────────────────────────────────────────

CREATE TABLE user_profile (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_text          TEXT,
  preferred_titles     JSONB NOT NULL DEFAULT '[]',
  preferred_skills     JSONB NOT NULL DEFAULT '[]',
  preferred_locations  JSONB NOT NULL DEFAULT '[]',
  preferred_work_model JSONB NOT NULL DEFAULT '[]',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Single-row table — insert initial empty profile
INSERT INTO user_profile (resume_text, preferred_titles, preferred_skills, preferred_locations, preferred_work_model)
VALUES (NULL, '[]', '[]', '[]', '[]');

-- ─── saved_jobs ───────────────────────────────────────────────────────────────

CREATE TABLE saved_jobs (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id   UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes    TEXT,
  UNIQUE(job_id)
);

CREATE INDEX saved_jobs_job_id_idx ON saved_jobs(job_id);

-- ─── applied_jobs ─────────────────────────────────────────────────────────────

CREATE TABLE applied_jobs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes      TEXT,
  UNIQUE(job_id)
);

CREATE INDEX applied_jobs_job_id_idx ON applied_jobs(job_id);

-- ─── dismissed_jobs ───────────────────────────────────────────────────────────

CREATE TABLE dismissed_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id)
);

CREATE INDEX dismissed_jobs_job_id_idx ON dismissed_jobs(job_id);

-- ─── ingestion_runs ───────────────────────────────────────────────────────────

CREATE TABLE ingestion_runs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMPTZ,
  status         ingestion_status NOT NULL DEFAULT 'failed',
  sources        JSONB            NOT NULL DEFAULT '[]',
  total_fetched  INTEGER          NOT NULL DEFAULT 0,
  total_inserted INTEGER          NOT NULL DEFAULT 0,
  total_updated  INTEGER          NOT NULL DEFAULT 0,
  total_skipped  INTEGER          NOT NULL DEFAULT 0,
  errors         JSONB            NOT NULL DEFAULT '[]'
);
