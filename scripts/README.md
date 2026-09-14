# Catalog bootstrap

Two-stage autonomous import that preloads LyricLantern with ~1,300 songs
(top Sinosphere Mandopop by year + a children's catalog). See the design
plan at `~/.claude/plans/i-would-like-to-toasty-ladybug.md` for the full
rationale.

## Prerequisites

1. Apply the migration `supabase/migrations/20260617120000_song_catalog.sql`
   in the Supabase SQL Editor.
2. Deploy the updated `process-song` edge function.
3. Set env vars (in `.env` or shell):
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — the anon (publishable) key
   - `YOUTUBE_API_KEY` — Google Cloud project with YouTube Data API v3 enabled
4. Install deps: `npm install` (adds `tsx` for running TS scripts).

## Stage A — Build the catalog

```bash
npm run build:catalog -- --years 2007-2026 --mandopop-per-year 50 --kids-target 300
```

Writes `data/catalog.jsonl`, one `{video_id, youtube_url, title_hint,
artist_hint, category, release_year, source, score}` per line. YouTube
quota: ~25,000 units for the default run — either spread across days,
or request a quota bump in the Cloud Console.

Tunable: edit `scripts/seeds/mandopop-artists.ts` and
`scripts/seeds/kids-seeds.ts` to widen or narrow the artist list / channel
list. Each artist contributes one search per active year, so ~50 artists
× 20 years = ~1,000 search calls.

## Stage B — Import

```bash
npm run import:songs -- --concurrency 3 --gap-ms 500
```

For each catalog entry, POSTs to the edge function (`bulkImport=true` flag),
which runs the lyric pipeline and the quality gate. Results land in
`songs` with `is_published=false` until you publish them manually.

Flags:
- `--limit N` — process only N entries (use for calibration: `--limit 50`)
- `--dry-run` — print what would be processed, don't touch the edge function
- `--catalog` / `--log` — alternate paths
- `EDGE_FUNCTION_URL=...` env var overrides the auto-derived URL

The importer is fully **idempotent and resumable**: it queries the DB for
already-processed videos and skips them. Recently-rejected videos stay
out for 30 days (negative cache); manual-review videos are skipped silently.

## Stage C — Calibrate, then publish

Nothing is visible to users yet. After the first run:

```sql
-- Inspect outcomes
SELECT category, quality_status, COUNT(*)
  FROM songs GROUP BY 1, 2 ORDER BY 1, 2;

-- Spot-check 30 random "passed" rows; click a video_id to verify it's a real song
SELECT video_id, title, artist, release_year, quality_score, quality_source
  FROM songs WHERE quality_status='passed' AND is_published=false
  ORDER BY random() LIMIT 30;

-- Bulk-publish everything that passed
SELECT public.publish_passed_songs();

-- Look at borderline rows to tune thresholds before subsequent runs
SELECT video_id, title, artist, quality_status, quality_score, quality_reasons
  FROM songs WHERE quality_status='manual_review' ORDER BY quality_score DESC LIMIT 50;
```

If too many false negatives (good songs flagged `manual_review`/`rejected`),
tune the thresholds in `supabase/functions/process-song/quality-gates.ts`
and re-deploy. Re-running the importer will re-attempt rejected videos
older than 30 days.

## Cost & quota

Per the design plan:
- OpenAI gpt-4o-mini: ~$10–30 for a full 1,300-song run.
- YouTube Data API: ~25k units for catalog build, ~1,300 for importer.
- Supabase: well within free tier.
