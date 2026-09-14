-- ============================================================
-- Widen mandarin_charts from 20 to 50 songs per year.
--
-- The table was created with inline CHECK constraints, which Postgres
-- auto-names <table>_<column>_check. Drop and re-add with wider bounds.
-- Safe to run more than once.
-- ============================================================

ALTER TABLE mandarin_charts DROP CONSTRAINT IF EXISTS mandarin_charts_rank_check;
ALTER TABLE mandarin_charts
  ADD CONSTRAINT mandarin_charts_rank_check CHECK (rank BETWEEN 1 AND 50);

-- Raise the ceiling so future years don't need another migration.
ALTER TABLE mandarin_charts DROP CONSTRAINT IF EXISTS mandarin_charts_year_check;
ALTER TABLE mandarin_charts
  ADD CONSTRAINT mandarin_charts_year_check CHECK (year BETWEEN 2006 AND 2035);

-- The seeding script clears a year before re-inserting it, so this index
-- supports both the delete and the per-year read the new UI does.
CREATE INDEX IF NOT EXISTS mandarin_charts_year_idx ON mandarin_charts (year);
