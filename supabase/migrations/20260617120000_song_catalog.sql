-- ============================================================
-- LyricLantern Song Catalog Migration
-- Adds category/year + a quality-gated publish workflow so the
-- bulk importer can land songs as is_published=false and only
-- promote vetted rows to the live catalog.
-- Run in Supabase: SQL Editor → New query → Paste → Run
-- ============================================================

-- 1. Catalog + quality columns on songs
-- ============================================================
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS category TEXT
    CHECK (category IS NULL OR category IN ('mandopop', 'kids')),
  ADD COLUMN IF NOT EXISTS release_year SMALLINT,
  ADD COLUMN IF NOT EXISTS hsk_level SMALLINT,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quality_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (quality_status IN ('pending', 'passed', 'rejected', 'manual_review')),
  ADD COLUMN IF NOT EXISTS quality_reasons JSONB,
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC,
  ADD COLUMN IF NOT EXISTS quality_source TEXT,
  ADD COLUMN IF NOT EXISTS import_attempt INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_songs_published_browse
  ON public.songs (category, release_year DESC, view_count DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_songs_quality_status
  ON public.songs (quality_status);

-- 2. Backfill: anything that exists today predates the gate, so trust it.
-- (Songs that landed via the existing per-user pipeline were vetted by users
-- typing in the URL and seeing the result — same trust profile as published.)
UPDATE public.songs
   SET is_published   = true,
       quality_status = 'passed',
       quality_score  = 1.0,
       quality_source = 'pre-migration'
 WHERE quality_status = 'pending'
   AND jsonb_typeof(lyrics) = 'array'
   AND jsonb_array_length(lyrics) > 0;

-- 3. Widen insert_processed_song so the importer can refresh failed/pending
--    rows in place — but NEVER overwrite a published row.
-- ============================================================
CREATE OR REPLACE FUNCTION public.insert_processed_song(
  p_video_id VARCHAR,
  p_youtube_url TEXT,
  p_title TEXT,
  p_artist TEXT,
  p_duration_ms INTEGER,
  p_thumbnail TEXT,
  p_lyrics JSONB
) RETURNS SETOF public.songs
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.songs (video_id, youtube_url, title, artist, duration_ms, thumbnail_url, lyrics)
  VALUES (p_video_id, p_youtube_url, p_title, p_artist, p_duration_ms, p_thumbnail, p_lyrics)
  ON CONFLICT (video_id) DO UPDATE
    SET youtube_url   = EXCLUDED.youtube_url,
        title         = COALESCE(EXCLUDED.title, public.songs.title),
        artist        = COALESCE(EXCLUDED.artist, public.songs.artist),
        duration_ms   = COALESCE(EXCLUDED.duration_ms, public.songs.duration_ms),
        thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, public.songs.thumbnail_url),
        lyrics        = EXCLUDED.lyrics,
        updated_at    = now()
    WHERE public.songs.is_published = false
      AND public.songs.quality_status IN ('pending', 'rejected');
  SELECT * FROM public.songs WHERE video_id = p_video_id;
$$;

GRANT EXECUTE ON FUNCTION public.insert_processed_song(VARCHAR, TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB) TO anon, authenticated;

-- 4. set_song_metadata: importer-facing RPC. The edge function calls this
--    after lyrics processing to attach catalog tags + quality verdict.
--    Auto-publishes when quality_status='passed' AND auto_publish flag is on.
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_song_metadata(
  p_video_id VARCHAR,
  p_category TEXT,
  p_release_year SMALLINT,
  p_quality_status TEXT,
  p_quality_score NUMERIC,
  p_quality_reasons JSONB,
  p_quality_source TEXT,
  p_auto_publish BOOLEAN DEFAULT false
) RETURNS SETOF public.songs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.songs
     SET category         = COALESCE(p_category, category),
         release_year     = COALESCE(p_release_year, release_year),
         quality_status   = p_quality_status,
         quality_score    = p_quality_score,
         quality_reasons  = p_quality_reasons,
         quality_source   = p_quality_source,
         import_attempt   = import_attempt + 1,
         last_imported_at = now(),
         is_published     = CASE
           WHEN is_published = true THEN true  -- never demote
           WHEN p_auto_publish AND p_quality_status = 'passed' THEN true
           ELSE is_published
         END
   WHERE video_id = p_video_id;
  RETURN QUERY SELECT * FROM public.songs WHERE video_id = p_video_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_song_metadata(VARCHAR, TEXT, SMALLINT, TEXT, NUMERIC, JSONB, TEXT, BOOLEAN) TO anon, authenticated;

-- 5. Bulk-publish helper, intended for SQL Editor use after first calibration run:
--    SELECT public.publish_passed_songs();
-- ============================================================
CREATE OR REPLACE FUNCTION public.publish_passed_songs()
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count BIGINT;
BEGIN
  UPDATE public.songs
     SET is_published = true,
         updated_at   = now()
   WHERE quality_status = 'passed'
     AND is_published   = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Intentionally NOT granting to anon/authenticated — call from SQL Editor only.
REVOKE ALL ON FUNCTION public.publish_passed_songs() FROM PUBLIC;

-- ============================================================
-- DONE. Calibration workflow after running the importer:
--   1. SELECT category, quality_status, COUNT(*) FROM songs GROUP BY 1,2;
--   2. Spot-check ~50 rows where quality_status='passed'.
--   3. When satisfied: SELECT publish_passed_songs();
-- ============================================================
