-- Migration: Add mandarin_charts table for the Top 20 Mandarin Songs by Year feature
-- Run this in the Supabase dashboard SQL editor before running the seeding script.

CREATE TABLE IF NOT EXISTS mandarin_charts (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id      VARCHAR(11) NOT NULL UNIQUE,   -- YouTube video ID (global dedup key)
  youtube_url   TEXT NOT NULL,
  title         TEXT,
  artist        TEXT,
  thumbnail_url TEXT,
  year          INTEGER NOT NULL CHECK (year BETWEEN 2006 AND 2025),
  rank          INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 20),
  view_count    BIGINT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(year, rank)
);

-- Enable Row Level Security
ALTER TABLE mandarin_charts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the chart data
CREATE POLICY "mandarin_charts_public_read"
  ON mandarin_charts
  FOR SELECT
  USING (true);

-- NOTE: there are deliberately NO public INSERT/UPDATE policies.
-- The publishable (anon) key ships in the client bundle, so a permissive write
-- policy would let anyone overwrite the chart. The seeding script authenticates
-- with the SECRET key, which bypasses RLS entirely, so ingestion still works
-- while the table stays read-only to the public.

-- Index for fast year-based lookups
CREATE INDEX IF NOT EXISTS mandarin_charts_year_rank_idx
  ON mandarin_charts (year ASC, rank ASC);
