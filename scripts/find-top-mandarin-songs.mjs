#!/usr/bin/env node
/**
 * find-top-mandarin-songs.mjs
 *
 * Discovers the top 20 Mandarin-language songs for each year from 2006 to 2025
 * using the YouTube Data API, then seeds the `mandarin_charts` Supabase table.
 *
 * Prerequisites:
 *   - Run the SQL migration first:
 *     supabase/migrations/add-mandarin-charts.sql
 *   - Supply credentials EITHER via a .env file in the repo root OR as real
 *     environment variables. Both work:
 *       VITE_SUPABASE_URL=https://your-project.supabase.co
 *       SUPABASE_SECRET_KEY=your-supabase-secret-key
 *       YOUTUBE_API_KEY=your-youtube-data-api-v3-key
 *
 *     SUPABASE_SECRET_KEY is the secret / service_role key. It bypasses RLS so
 *     that mandarin_charts needs no public write policy. Keep it out of any
 *     frontend bundle and out of version control (.env is gitignored).
 *
 * Usage:
 *   npm run seed:charts
 *
 * (Uses --env-file-if-exists, so it reads .env when present and otherwise
 * falls back to whatever is already in the process environment.)
 */

import { createClient } from '@supabase/supabase-js';

// --- Config ---------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Writes use the SECRET key, never the publishable/anon key. The secret key
// bypasses RLS, so mandarin_charts can stay public-read / no-public-write.
// This script runs locally or in CI only - the secret key must never be
// exposed to a browser bundle.
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

const START_YEAR = 2006;
const END_YEAR = 2025;
const SONGS_PER_YEAR = 20;
const SEARCH_MAX_RESULTS = 25; // per query (we run multiple queries per year)
const YEAR_DELAY_MS = 1500;    // pause between years to stay within YouTube quota

// Search queries per year - Chinese + English for better coverage.
// {year} is replaced at runtime.
const QUERY_TEMPLATES = [
  '华语流行歌曲 {year}',
  '国语歌曲 {year} MV',
  '台湾流行音乐 {year}',
  'Chinese Mandarin pop {year}',
];

// --- Helpers --------------------------------------------------------------

/** Normalize a string for deduplication: lowercase, strip punctuation, trim. */
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w一-鿿]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build a dedup key from artist + title. */
function songKey(artist, title) {
  return `${normalize(artist)}|${normalize(title)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** YouTube Data API v3 - search.list */
async function youtubeSearch(query, year, maxResults = SEARCH_MAX_RESULTS) {
  const params = new URLSearchParams({
    part: 'id,snippet',
    q: query,
    type: 'video',
    videoCategoryId: '10', // Music
    order: 'viewCount',
    publishedAfter: `${year}-01-01T00:00:00Z`,
    publishedBefore: `${year + 1}-01-01T00:00:00Z`,
    maxResults: String(maxResults),
    key: YOUTUBE_API_KEY,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `YouTube search failed (${res.status}): ${err?.error?.message ?? res.statusText}`
    );
  }

  const data = await res.json();
  return (data.items ?? [])
    .map((item) => ({
      video_id: item.id?.videoId,
      title: item.snippet?.title,
      channel: item.snippet?.channelTitle,
      thumbnail_url:
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url,
    }))
    .filter((v) => v.video_id);
}

/**
 * YouTube Data API v3 - videos.list (statistics + snippet)
 * Fetches real view counts for up to 50 video IDs per request.
 */
async function youtubeVideoStats(videoIds) {
  if (videoIds.length === 0) return {};

  const chunks = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  const statsMap = {};

  for (const chunk of chunks) {
    const params = new URLSearchParams({
      part: 'statistics,snippet',
      id: chunk.join(','),
      key: YOUTUBE_API_KEY,
    });

    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn(`  ! videos.list failed: ${err?.error?.message ?? res.statusText}`);
      continue;
    }

    const data = await res.json();
    for (const item of data.items ?? []) {
      statsMap[item.id] = {
        view_count: parseInt(item.statistics?.viewCount ?? '0', 10),
        title: item.snippet?.title,
        channel: item.snippet?.channelTitle,
        thumbnail_url:
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url,
      };
    }
  }

  return statsMap;
}

/**
 * Extract a likely artist name from a YouTube video title and channel.
 * Many music videos use "Artist - Song Title (Official MV)" format.
 */
function extractArtistAndTitle(rawTitle, channelTitle) {
  const dashMatch = rawTitle.match(/^(.+?)\s[-–—]\s(.+)$/);
  if (dashMatch) {
    return { artist: dashMatch[1].trim(), title: dashMatch[2].trim() };
  }
  return { artist: channelTitle ?? 'Unknown', title: rawTitle };
}

// --- Main -----------------------------------------------------------------

async function main() {
  if (!SUPABASE_URL || SUPABASE_URL.includes('your-project')) {
    console.error('ERROR: VITE_SUPABASE_URL is not set. Add it to your .env file.');
    process.exit(1);
  }
  if (!SUPABASE_SECRET_KEY) {
    console.error('ERROR: SUPABASE_SECRET_KEY is not set. Add it to your .env file.');
    console.error('  Supabase dashboard -> Project Settings -> API Keys -> secret key');
    console.error('  (labelled "service_role" on older dashboards).');
    process.exit(1);
  }
  if (SUPABASE_SECRET_KEY.startsWith('sb_publishable_')) {
    console.error('ERROR: SUPABASE_SECRET_KEY holds a PUBLISHABLE key.');
    console.error('  That key cannot write to mandarin_charts (public read only).');
    console.error('  Use the SECRET key instead - never put it in frontend code.');
    process.exit(1);
  }
  if (!YOUTUBE_API_KEY) {
    console.error('ERROR: YOUTUBE_API_KEY is not set. Add it to your .env file.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('Lyric Lantern - Top 20 Mandarin Songs by Year');
  console.log(`Covering years ${START_YEAR}-${END_YEAR}`);
  console.log('-'.repeat(60));

  // Preflight: confirm the mandarin_charts table is reachable BEFORE spending any
  // YouTube quota. A full run costs ~8,040 of the default 10,000 units/day, so a
  // missing table discovered late would waste the entire day's retry budget.
  const { error: preflightError } = await supabase
    .from('mandarin_charts')
    .select('video_id')
    .limit(1);

  if (preflightError) {
    console.error('\nERROR: cannot read the mandarin_charts table.');
    console.error(`  ${preflightError.message}`);
    console.error('\nFix: open your Supabase dashboard -> SQL Editor -> New query,');
    console.error('paste the contents of supabase/migrations/add-mandarin-charts.sql,');
    console.error('and click Run. Then re-run this script.');
    console.error('\nStopping now so that no YouTube quota is consumed.');
    process.exit(1);
  }
  console.log('Preflight OK: mandarin_charts is reachable.\n');

  // Global dedup sets - a song belongs to its EARLIEST charting year
  const seenVideoIds = new Set();
  const seenSongKeys = new Set();

  let totalInserted = 0;
  const yearSummary = [];

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    console.log(`\nProcessing year ${year}...`);

    // Step 1: Collect candidates from multiple queries
    const candidateMap = new Map();

    for (const template of QUERY_TEMPLATES) {
      const query = template.replace('{year}', String(year));
      try {
        const results = await youtubeSearch(query, year);
        for (const r of results) {
          if (!candidateMap.has(r.video_id)) {
            candidateMap.set(r.video_id, r);
          }
        }
        await sleep(300);
      } catch (err) {
        console.warn(`  ! Search "${query}" failed: ${err.message}`);
      }
    }

    if (candidateMap.size === 0) {
      console.warn(`  ! No candidates found for ${year} - skipping.`);
      yearSummary.push({ year, count: 0 });
      continue;
    }

    console.log(`  Found ${candidateMap.size} raw candidates.`);

    // Step 2: Fetch real view counts
    const allIds = [...candidateMap.keys()];
    let statsMap = {};
    try {
      statsMap = await youtubeVideoStats(allIds);
    } catch (err) {
      console.warn(`  ! Could not fetch video stats: ${err.message}`);
    }

    // Step 3: Build enriched candidate list
    const enriched = [];
    for (const [videoId, candidate] of candidateMap) {
      const stats = statsMap[videoId];
      const rawTitle = stats?.title ?? candidate.title ?? '';
      const channel = stats?.channel ?? candidate.channel ?? '';
      const { artist, title } = extractArtistAndTitle(rawTitle, channel);

      enriched.push({
        video_id: videoId,
        youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
        title,
        artist,
        thumbnail_url: stats?.thumbnail_url ?? candidate.thumbnail_url ?? null,
        view_count: stats?.view_count ?? 0,
      });
    }

    enriched.sort((a, b) => b.view_count - a.view_count);

    // Step 4: Deduplicate and pick top 20
    const yearSongs = [];
    for (const song of enriched) {
      if (yearSongs.length >= SONGS_PER_YEAR) break;

      if (seenVideoIds.has(song.video_id)) continue;
      const key = songKey(song.artist, song.title);
      if (seenSongKeys.has(key)) continue;

      seenVideoIds.add(song.video_id);
      seenSongKeys.add(key);
      yearSongs.push(song);
    }

    if (yearSongs.length === 0) {
      console.warn(`  ! No unique songs after deduplication for ${year}.`);
      yearSummary.push({ year, count: 0 });
      await sleep(YEAR_DELAY_MS);
      continue;
    }

    // Step 5: Upsert into mandarin_charts
    const rows = yearSongs.map((song, idx) => ({
      video_id: song.video_id,
      youtube_url: song.youtube_url,
      title: song.title,
      artist: song.artist,
      thumbnail_url: song.thumbnail_url,
      year,
      rank: idx + 1,
      view_count: song.view_count,
    }));

    const { error } = await supabase
      .from('mandarin_charts')
      .upsert(rows, { onConflict: 'video_id' });

    if (error) {
      console.error(`  x Supabase upsert error for ${year}: ${error.message}`);
      yearSummary.push({ year, count: 0, error: error.message });
    } else {
      console.log(`  OK Inserted ${yearSongs.length} songs for ${year}`);
      yearSongs.forEach((s, i) =>
        console.log(
          `    ${String(i + 1).padStart(2, ' ')}. ${s.artist} - ${s.title} (${(s.view_count / 1e6).toFixed(1)}M views)`
        )
      );
      totalInserted += yearSongs.length;
      yearSummary.push({ year, count: yearSongs.length });
    }

    await sleep(YEAR_DELAY_MS);
  }

  // Summary
  console.log('\n' + '-'.repeat(60));
  console.log(`Done. Total songs inserted: ${totalInserted}`);
  console.log('\nYear summary:');
  for (const { year, count, error } of yearSummary) {
    const status = error
      ? `ERROR: ${error}`
      : count < SONGS_PER_YEAR
        ? `${count} songs (fewer than 20)`
        : `${count} songs`;
    console.log(`  ${year}: ${status}`);
  }

  if (totalInserted === 0) {
    console.log('\nNothing was inserted. Check your API keys and that the migration SQL has been run.');
  } else {
    console.log('\nVisit /top20 on your Lyric Lantern site to see the chart.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
