/**
 * find-top-mandarin-songs.mjs
 *
 * Discovers the top 50 Mandarin-language songs for each year and seeds the
 * `mandarin_charts` Supabase table.
 *
 * WHAT CHANGED (v2):
 *   - 50 songs per year (was 20); maxResults raised to 50 (same API cost)
 *   - LANGUAGE FILTERING: rejects Korean / Japanese results, which previously
 *     slipped in because ranking was purely by view count
 *   - Deletes a year's existing rows before inserting, so re-runs don't
 *     collide with the UNIQUE(year, rank) constraint
 *   - --years=2020-2025 to run a subset; --dry-run to preview without writing
 *
 * Prerequisites:
 *   - Run supabase/migrations/20260914000200_widen_charts_to_50.sql first
 *   - Credentials via .env.local or real env vars:
 *       VITE_SUPABASE_URL=https://your-project.supabase.co
 *       SUPABASE_SECRET_KEY=your-supabase-secret-key
 *       YOUTUBE_API_KEY=your-youtube-data-api-v3-key
 *
 * Usage:
 *   npm run seed:charts
 *   npm run seed:charts -- --years=2024-2025
 *   npm run seed:charts -- --dry-run
 *
 * API cost: ~4 searches x 100 units x N years, plus ~1 unit per 50 videos.
 * All 20 years ~= 8,100 units against the default 10,000/day quota.
 */

import { createClient } from '@supabase/supabase-js';

// --- Config ---------------------------------------------------------------

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

let START_YEAR = 2006;
let END_YEAR = 2025;
const SONGS_PER_YEAR = 50;
const SEARCH_MAX_RESULTS = 50;   // search.list costs 100 units regardless
const YEAR_DELAY_MS = 1500;

// --- CLI flags ------------------------------------------------------------

const DRY_RUN = process.argv.includes('--dry-run');
const yearsArg = process.argv.find((a) => a.startsWith('--years='));
if (yearsArg) {
  const spec = yearsArg.split('=')[1];
  const m = spec.match(/^(\d{4})(?:-(\d{4}))?$/);
  if (!m) {
    console.error(`ERROR: --years must look like --years=2024 or --years=2020-2025`);
    process.exit(1);
  }
  START_YEAR = parseInt(m[1], 10);
  END_YEAR = m[2] ? parseInt(m[2], 10) : START_YEAR;
}

const QUERY_TEMPLATES = [
  '华语流行歌曲 {year}',
  '国语歌曲 {year} MV',
  '台湾流行音乐 {year}',
  'Chinese Mandarin pop {year}',
];

// --- Language detection ---------------------------------------------------
// Mandarin uses Han characters only. Korean titles carry Hangul; Japanese
// titles almost always carry kana. Those two scripts are decisive rejections.

const HANGUL = /[가-힯ᄀ-ᇿ㄰-㆏]/;
const KANA   = /[぀-ゟ゠-ヿ]/;
const HAN    = /[一-鿿㐀-䶿]/;
// Punctuation used almost exclusively in Japanese titles.
const JP_PUNCT = /[「」『』・]/;

// Channels that repeatedly surfaced K-pop / J-pop in music-category searches.
const BLOCKED_ARTISTS = [
  // K-pop labels / aggregators
  'hybe', 'smtown', 'jyp entertainment', 'jyp ent.', 'yg entertainment',
  'bighit', 'big hit', 'starship', '1thek', 'stone music', 'mnet',
  'cube entertainment', 'pledis', 'ador', 'source music', 'kakao',
  // J-pop labels
  'avex', 'sony music japan', 'universal music japan', 'pony canyon',
  'victor entertainment', 'lantis', 'king records',
  // Japanese acts whose names are kanji-only, which script detection cannot
  // distinguish from Chinese. Both romanized and native spellings.
  // Add to this list when the review output surfaces a new one.
  'yoasobi', 'yonezu', 'kenshi yonezu', '米津玄師',
  'higedandism', 'hige dandism', '髭男',
  'king gnu', 'aimyon', 'あいみょん', 'radwimps', 'back number',
  'vaundy', 'fujii kaze', '藤井風', 'one ok rock', 'yuuri', '優里',
];

/**
 * Decide whether a candidate is Mandarin.
 * Returns 'accept' | 'ambiguous' | 'reject' plus a human-readable reason.
 */
function classifyLanguage({ title, channel, audioLang }) {
  const text = `${title ?? ''} ${channel ?? ''}`;

  const haystack = `${title ?? ''} ${channel ?? ''}`.toLowerCase();
  for (const bad of BLOCKED_ARTISTS) {
    if (haystack.includes(bad)) return { verdict: 'reject', reason: `blocked artist (${bad})` };
  }

  const lang = (audioLang ?? '').toLowerCase();

  // An explicit audio-language tag is the strongest signal available.
  if (lang.startsWith('ko')) return { verdict: 'reject', reason: `audio language ${audioLang}` };
  if (lang.startsWith('ja')) return { verdict: 'reject', reason: `audio language ${audioLang}` };
  if (lang.startsWith('zh')) return { verdict: 'accept', reason: `audio language ${audioLang}` };

  // Script detection on title + channel.
  if (HANGUL.test(text)) return { verdict: 'reject', reason: 'Hangul in title/channel' };
  if (KANA.test(text))   return { verdict: 'reject', reason: 'kana in title/channel' };
  if (JP_PUNCT.test(text)) return { verdict: 'reject', reason: 'Japanese punctuation' };
  // Han with no confirming audio tag is very likely Chinese, but a kanji-only
  // Japanese title is indistinguishable. Accept, and flag it for review.
  if (HAN.test(text))    return { verdict: 'accept', reason: 'Han script (unconfirmed)' };

  // Latin-only title, no audio tag: could be a Mandarin song with an English
  // title. Keep it as a fallback, used only if the year is short of 50.
  return { verdict: 'ambiguous', reason: 'no script or language signal' };
}

// --- Helpers --------------------------------------------------------------

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^\w一-鿿]/g, ' ').replace(/\s+/g, ' ').trim();
}
function songKey(artist, title) { return `${normalize(artist)}|${normalize(title)}`; }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function youtubeSearch(query, year, maxResults = SEARCH_MAX_RESULTS) {
  const params = new URLSearchParams({
    part: 'id,snippet',
    q: query,
    type: 'video',
    videoCategoryId: '10',
    order: 'viewCount',
    regionCode: 'TW',            // bias the pool toward Chinese-language music
    relevanceLanguage: 'zh-Hant',
    publishedAfter: `${year}-01-01T00:00:00Z`,
    publishedBefore: `${year + 1}-01-01T00:00:00Z`,
    maxResults: String(maxResults),
    key: YOUTUBE_API_KEY,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`YouTube search failed (${res.status}): ${err?.error?.message ?? res.statusText}`);
  }
  const data = await res.json();
  return (data.items ?? [])
    .map((item) => ({
      video_id: item.id?.videoId,
      title: item.snippet?.title,
      channel: item.snippet?.channelTitle,
      thumbnail_url:
        item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
    }))
    .filter((v) => v.video_id);
}

async function youtubeVideoStats(videoIds) {
  if (videoIds.length === 0) return {};
  const chunks = [];
  for (let i = 0; i < videoIds.length; i += 50) chunks.push(videoIds.slice(i, i + 50));

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
        // The field that makes language filtering reliable when it is present.
        audioLang: item.snippet?.defaultAudioLanguage ?? item.snippet?.defaultLanguage ?? null,
        thumbnail_url:
          item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
      };
    }
  }
  return statsMap;
}

function extractArtistAndTitle(rawTitle, channelTitle) {
  const dashMatch = rawTitle.match(/^(.+?)\s[-–—]\s(.+)$/);
  if (dashMatch) return { artist: dashMatch[1].trim(), title: dashMatch[2].trim() };
  return { artist: channelTitle ?? 'Unknown', title: rawTitle };
}

// --- Main -----------------------------------------------------------------

async function main() {
  if (!SUPABASE_URL || SUPABASE_URL.includes('your-project')) {
    console.error('ERROR: VITE_SUPABASE_URL is not set.'); process.exit(1);
  }
  if (!SUPABASE_SECRET_KEY) {
    console.error('ERROR: SUPABASE_SECRET_KEY is not set.');
    console.error('  Supabase dashboard -> Project Settings -> API Keys -> secret key');
    process.exit(1);
  }
  if (!YOUTUBE_API_KEY) {
    console.error('ERROR: YOUTUBE_API_KEY is not set.'); process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });

  console.log(`Years        : ${START_YEAR}-${END_YEAR}`);
  console.log(`Songs/year   : ${SONGS_PER_YEAR}`);
  console.log(`Mode         : ${DRY_RUN ? 'DRY RUN (nothing written)' : 'live'}`);
  const searches = (END_YEAR - START_YEAR + 1) * QUERY_TEMPLATES.length;
  console.log(`YouTube cost : ~${searches * 100} units (quota 10,000/day)\n`);

  // Preflight: confirm the table is reachable before spending quota.
  const { error: preflightError } = await supabase
    .from('mandarin_charts').select('video_id').limit(1);
  if (preflightError) {
    console.error('\nERROR: cannot read the mandarin_charts table.');
    console.error(`  ${preflightError.message}`);
    console.error('\nFix: Supabase dashboard -> SQL Editor, run the migration, then retry.');
    process.exit(1);
  }

  let totalInserted = 0;
  const yearSummary = [];
  const rejectLog = [];
  const reviewLog = [];

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    console.log(`\n=== ${year} ===`);

    // Each year is ranked independently, so a song can chart in its own year
    // even if a later query saw it. Dedupe is per-year, not global.
    const seenVideoIds = new Set();
    const seenSongKeys = new Set();

    const candidateMap = new Map();
    for (const template of QUERY_TEMPLATES) {
      const query = template.replace('{year}', String(year));
      try {
        const results = await youtubeSearch(query, year);
        for (const r of results) if (!candidateMap.has(r.video_id)) candidateMap.set(r.video_id, r);
        await sleep(300);
      } catch (err) {
        console.warn(`  ! Search "${query}" failed: ${err.message}`);
      }
    }

    if (candidateMap.size === 0) {
      console.warn(`  ! No candidates for ${year} - skipping.`);
      yearSummary.push({ year, count: 0 });
      continue;
    }
    console.log(`  ${candidateMap.size} raw candidates`);

    let statsMap = {};
    try { statsMap = await youtubeVideoStats([...candidateMap.keys()]); }
    catch (err) { console.warn(`  ! stats failed: ${err.message}`); }

    // Classify every candidate, then bucket it.
    const accepted = [];
    const ambiguous = [];
    let rejected = 0;

    for (const [videoId, candidate] of candidateMap) {
      const stats = statsMap[videoId];
      const rawTitle = stats?.title ?? candidate.title ?? '';
      const channel = stats?.channel ?? candidate.channel ?? '';
      const audioLang = stats?.audioLang ?? null;

      const { verdict, reason } = classifyLanguage({ title: rawTitle, channel, audioLang });
      if (verdict === 'reject') {
        rejected++;
        rejectLog.push({ year, title: rawTitle.slice(0, 60), reason });
        continue;
      }

      const { artist, title } = extractArtistAndTitle(rawTitle, channel);
      const song = {
        video_id: videoId,
        youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
        title, artist,
        thumbnail_url: stats?.thumbnail_url ?? candidate.thumbnail_url ?? null,
        view_count: stats?.view_count ?? 0,
      };
      if (verdict === 'accept' && reason.includes('unconfirmed')) {
        reviewLog.push({ year, artist, title: title.slice(0, 50) });
      }
      (verdict === 'accept' ? accepted : ambiguous).push(song);
    }

    accepted.sort((a, b) => b.view_count - a.view_count);
    ambiguous.sort((a, b) => b.view_count - a.view_count);
    console.log(`  ${accepted.length} confident / ${ambiguous.length} ambiguous / ${rejected} rejected`);

    // Fill with confident matches first; only backfill if short of the target.
    const yearSongs = [];
    for (const song of [...accepted, ...ambiguous]) {
      if (yearSongs.length >= SONGS_PER_YEAR) break;
      if (seenVideoIds.has(song.video_id)) continue;
      const key = songKey(song.artist, song.title);
      if (seenSongKeys.has(key)) continue;
      seenVideoIds.add(song.video_id);
      seenSongKeys.add(key);
      yearSongs.push(song);
    }

    if (yearSongs.length === 0) {
      console.warn(`  ! nothing usable for ${year}`);
      yearSummary.push({ year, count: 0 });
      await sleep(YEAR_DELAY_MS);
      continue;
    }

    const rows = yearSongs.map((song, idx) => ({ ...song, year, rank: idx + 1 }));

    if (DRY_RUN) {
      console.log(`  [dry run] would write ${rows.length} rows`);
      rows.slice(0, 5).forEach((s) =>
        console.log(`    ${String(s.rank).padStart(2)}. ${s.artist} - ${s.title} (${(s.view_count / 1e6).toFixed(1)}M)`));
      yearSummary.push({ year, count: rows.length });
      await sleep(YEAR_DELAY_MS);
      continue;
    }

    // Clear this year first. Without this, re-runs violate UNIQUE(year, rank)
    // whenever the ordering changes.
    const { error: delError } = await supabase.from('mandarin_charts').delete().eq('year', year);
    if (delError) {
      console.error(`  x could not clear ${year}: ${delError.message}`);
      yearSummary.push({ year, count: 0, error: delError.message });
      continue;
    }

    const { error } = await supabase.from('mandarin_charts').insert(rows);
    if (error) {
      console.error(`  x insert failed for ${year}: ${error.message}`);
      yearSummary.push({ year, count: 0, error: error.message });
    } else {
      console.log(`  OK ${rows.length} songs written`);
      rows.slice(0, 3).forEach((s) =>
        console.log(`    ${s.rank}. ${s.artist} - ${s.title} (${(s.view_count / 1e6).toFixed(1)}M)`));
      totalInserted += rows.length;
      yearSummary.push({ year, count: rows.length });
    }

    await sleep(YEAR_DELAY_MS);
  }

  console.log('\n===== SUMMARY =====');
  for (const { year, count, error } of yearSummary) {
    console.log(`  ${year}: ${error ? `ERROR: ${error}` : `${count} songs${count < SONGS_PER_YEAR ? ' (short of 50)' : ''}`}`);
  }
  console.log(`\nTotal written: ${totalInserted}`);

  if (reviewLog.length) {
    console.log(`\n===== WORTH AN EYEBALL (${reviewLog.length}) =====`);
    console.log('Matched on Chinese characters, but YouTube supplied no language tag,');
    console.log('so a kanji-titled Japanese song could hide here. If you spot one, add');
    console.log('its artist or channel to BLOCKED_CHANNELS and re-run just that year.');
    for (const r of reviewLog.slice(0, 25)) console.log(`  ${r.year}  ${r.artist} - ${r.title}`);
    if (reviewLog.length > 25) console.log(`  ... and ${reviewLog.length - 25} more`);
  }

  if (rejectLog.length) {
    console.log(`\n===== REJECTED (${rejectLog.length}) - spot-check these =====`);
    for (const r of rejectLog.slice(0, 40)) console.log(`  ${r.year}  ${r.reason.padEnd(28)}  ${r.title}`);
    if (rejectLog.length > 40) console.log(`  ... and ${rejectLog.length - 40} more`);
  }
}

main().catch((err) => { console.error('\nFATAL:', err); process.exit(1); });
