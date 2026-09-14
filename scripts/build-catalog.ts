// Builds data/catalog.jsonl — a deduped list of YouTube video IDs to feed the importer.
// Sinosphere Mandopop by year (top ~50/year × 20 years) + a kids catalog (~300).
//
// Usage:
//   YOUTUBE_API_KEY=... npx tsx scripts/build-catalog.ts \
//     [--years 2007-2026] [--mandopop-per-year 50] [--kids-target 300] [--out data/catalog.jsonl]
//
// Quota note: each YouTube search costs 100 units; default daily quota is 10,000.
// With ~200 mandopop searches + ~50 kids playlists/searches, expect ~25,000 units —
// either spread the run across days or request a quota bump (free, instant approval).

import { promises as fs } from "node:fs";
import { dirname } from "node:path";
import { YouTubeClient } from "./lib/youtube.ts";
import type { YTSearchResult, YTVideoDetails } from "./lib/youtube.ts";
import { MANDOPOP_ARTISTS, MANDOPOP_THEME_QUERIES } from "./seeds/mandopop-artists.ts";
import { KIDS_CHANNELS, KIDS_CLASSIC_QUERIES } from "./seeds/kids-seeds.ts";

interface CatalogEntry {
  video_id: string;
  youtube_url: string;
  title_hint: string;
  artist_hint: string;
  category: "mandopop" | "kids";
  release_year: number | null;
  source: string; // why this entry made it into the catalog
  score: number;
}

const args = parseArgs(process.argv.slice(2));
const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) {
  console.error("YOUTUBE_API_KEY env var is required");
  process.exit(1);
}

const yearStart = args.yearStart ?? 2007;
const yearEnd = args.yearEnd ?? 2026;
const mandopopPerYear = args.mandopopPerYear ?? 50;
const kidsTarget = args.kidsTarget ?? 300;
const outPath = args.out ?? "data/catalog.jsonl";

const yt = new YouTubeClient(apiKey);

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

async function main() {
  console.log(`Year range: ${yearStart}–${yearEnd}, target ${mandopopPerYear}/yr mandopop + ${kidsTarget} kids`);
  const seen = new Set<string>();
  const entries: CatalogEntry[] = [];

  // ── Mandopop: per-year per-artist YouTube searches ──
  console.log(`\n=== Mandopop catalog ===`);
  const mandopopByYear: Record<number, CatalogEntry[]> = {};
  for (let year = yearStart; year <= yearEnd; year++) mandopopByYear[year] = [];

  for (const artist of MANDOPOP_ARTISTS) {
    const [aStart, aEnd] = artist.active;
    for (let year = Math.max(yearStart, aStart); year <= Math.min(yearEnd, aEnd); year++) {
      const query = `${artist.name} ${year} 官方`;
      try {
        const results = await yt.search(query, 6);
        const candidates = await enrichAndScore(results, { expectedYear: year, expectedArtist: artist.name });
        for (const c of candidates) {
          if (seen.has(c.video_id)) continue;
          if (c.score < 0.5) continue;
          seen.add(c.video_id);
          c.category = "mandopop";
          c.release_year = year;
          c.source = `mandopop:${artist.name}@${year}`;
          mandopopByYear[year].push(c);
        }
      } catch (e: any) {
        if (e?.status === 403) {
          console.error(`YouTube quota exhausted at units=${yt.unitsSpent}. Halting mandopop pass.`);
          break;
        }
        console.warn(`search failed (${query}):`, e?.message ?? e);
      }
      await sleep(120); // gentle pacing
    }
    console.log(`  ${artist.name} → cumulative ${entries.length + sumLen(mandopopByYear)} entries, units=${yt.unitsSpent}`);
  }

  // ── Mandopop: theme queries to broaden ──
  for (const theme of MANDOPOP_THEME_QUERIES) {
    for (let year = yearStart; year <= yearEnd; year += 5) {
      const query = `${theme} ${year}`;
      try {
        const results = await yt.search(query, 8);
        const candidates = await enrichAndScore(results, { expectedYear: year });
        for (const c of candidates) {
          if (seen.has(c.video_id)) continue;
          if (c.score < 0.55) continue;
          seen.add(c.video_id);
          c.category = "mandopop";
          c.release_year = year;
          c.source = `mandopop_theme:${theme}@${year}`;
          mandopopByYear[year].push(c);
        }
      } catch (e: any) {
        if (e?.status === 403) {
          console.error(`YouTube quota exhausted at units=${yt.unitsSpent}.`);
          break;
        }
      }
      await sleep(120);
    }
  }

  // Trim each year to mandopopPerYear, prefer higher score then higher view count.
  for (let year = yearStart; year <= yearEnd; year++) {
    const sorted = mandopopByYear[year].sort((a, b) => b.score - a.score).slice(0, mandopopPerYear);
    entries.push(...sorted);
  }
  console.log(`Mandopop total after per-year cap: ${entries.length}`);

  // ── Kids ──
  console.log(`\n=== Kids catalog ===`);
  const kidsEntries: CatalogEntry[] = [];

  for (const channel of KIDS_CHANNELS) {
    if (kidsEntries.length >= kidsTarget) break;
    try {
      let uploadsPlaylist = "";
      if (channel.handle) {
        const ch = await yt.channelByHandle(channel.handle);
        if (!ch) {
          console.warn(`channel not found: ${channel.handle}`);
          continue;
        }
        uploadsPlaylist = ch.uploadsPlaylistId;
      }
      if (!uploadsPlaylist) continue;
      const items = await yt.playlistItems(uploadsPlaylist, channel.maxSongs ?? 30);
      const details = await yt.videos(items.map((i) => i.videoId));
      for (const d of details) {
        if (seen.has(d.videoId)) continue;
        if (!isPlausibleKidsSong(d)) continue;
        const c = entryFromDetails(d, 0.85);
        c.category = "kids";
        c.release_year = yearFromIso(d.publishedAt);
        c.source = `kids_channel:${channel.name}`;
        seen.add(d.videoId);
        kidsEntries.push(c);
        if (kidsEntries.length >= kidsTarget) break;
      }
    } catch (e: any) {
      if (e?.status === 403) {
        console.error(`YouTube quota exhausted at units=${yt.unitsSpent}.`);
        break;
      }
      console.warn(`kids channel ${channel.name} failed:`, e?.message ?? e);
    }
    console.log(`  channel ${channel.name} → kids count ${kidsEntries.length}, units=${yt.unitsSpent}`);
  }

  for (const q of KIDS_CLASSIC_QUERIES) {
    if (kidsEntries.length >= kidsTarget) break;
    try {
      const results = await yt.search(q, 5);
      const candidates = await enrichAndScore(results, {});
      for (const c of candidates) {
        if (seen.has(c.video_id)) continue;
        if (c.score < 0.5) continue;
        c.category = "kids";
        c.source = `kids_classic:${q}`;
        seen.add(c.video_id);
        kidsEntries.push(c);
        if (kidsEntries.length >= kidsTarget) break;
      }
    } catch (e: any) {
      if (e?.status === 403) break;
    }
    await sleep(120);
  }

  entries.push(...kidsEntries);
  console.log(`Kids total: ${kidsEntries.length}`);

  // ── Write JSONL ──
  await fs.mkdir(dirname(outPath), { recursive: true });
  const lines = entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
  await fs.writeFile(outPath, lines, "utf8");
  console.log(`\nWrote ${entries.length} entries to ${outPath}`);
  console.log(`YouTube units spent: ${yt.unitsSpent}`);
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function enrichAndScore(
  results: YTSearchResult[],
  ctx: { expectedYear?: number; expectedArtist?: string }
): Promise<CatalogEntry[]> {
  if (results.length === 0) return [];
  const details = await yt.videos(results.map((r) => r.videoId));
  const detailsById = new Map(details.map((d) => [d.videoId, d]));
  const out: CatalogEntry[] = [];
  for (const r of results) {
    const d = detailsById.get(r.videoId);
    if (!d) continue;
    if (!d.embeddable || d.privacyStatus !== "public") continue;
    if (d.durationSec != null && (d.durationSec < 45 || d.durationSec > 600)) continue;
    const score = scoreVideo(d, ctx);
    out.push(entryFromDetails(d, score));
  }
  return out;
}

function entryFromDetails(d: YTVideoDetails, score: number): CatalogEntry {
  return {
    video_id: d.videoId,
    youtube_url: `https://www.youtube.com/watch?v=${d.videoId}`,
    title_hint: d.title,
    artist_hint: d.channelTitle,
    category: "mandopop",
    release_year: null,
    source: "",
    score,
  };
}

function scoreVideo(d: YTVideoDetails, ctx: { expectedYear?: number; expectedArtist?: string }): number {
  let s = 0.5;
  const title = d.title.toLowerCase();
  const channel = d.channelTitle.toLowerCase();

  // Negative signals first (kill score for obvious bad matches).
  if (/instrumental|karaoke|伴奏|纯音乐|純音樂|cover|翻唱|reaction|reacts|tutorial|教学|教學|piano version|guitar version/i.test(title)) s -= 0.6;
  if (/\blive\s*版\b|演唱会|演唱會/i.test(title)) s -= 0.2;
  if (/\bremix\b|\bedit\b|mashup/i.test(title)) s -= 0.3;

  // Positive signals.
  if (/official|官方|官方mv|mv|高清|hd/i.test(title)) s += 0.15;
  if (/official|vevo|records|music/.test(channel)) s += 0.1;
  if (d.viewCount > 1_000_000) s += 0.15;
  if (d.viewCount > 10_000_000) s += 0.1;

  if (ctx.expectedArtist) {
    if (d.channelTitle.includes(ctx.expectedArtist) || d.title.includes(ctx.expectedArtist)) s += 0.2;
  }
  if (ctx.expectedYear) {
    const y = yearFromIso(d.publishedAt);
    if (y != null) {
      const diff = Math.abs(y - ctx.expectedYear);
      if (diff <= 1) s += 0.15;
      else if (diff <= 3) s += 0.05;
      else if (diff > 6) s -= 0.1;
    }
  }
  return Math.max(0, Math.min(1, s));
}

function isPlausibleKidsSong(d: YTVideoDetails): boolean {
  if (!d.embeddable || d.privacyStatus !== "public") return false;
  if (d.durationSec == null) return true;
  return d.durationSec >= 30 && d.durationSec <= 600;
}

function yearFromIso(iso: string): number | null {
  if (!iso) return null;
  const m = /^(\d{4})/.exec(iso);
  return m ? Number(m[1]) : null;
}

function sumLen<T>(rec: Record<number, T[]>): number {
  return Object.values(rec).reduce((a, b) => a + b.length, 0);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv: string[]): {
  yearStart?: number; yearEnd?: number; mandopopPerYear?: number; kidsTarget?: number; out?: string;
} {
  const out: any = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--years" && argv[i + 1]) {
      const m = /^(\d{4})-(\d{4})$/.exec(argv[++i]);
      if (m) { out.yearStart = Number(m[1]); out.yearEnd = Number(m[2]); }
    } else if (a === "--mandopop-per-year" && argv[i + 1]) {
      out.mandopopPerYear = Number(argv[++i]);
    } else if (a === "--kids-target" && argv[i + 1]) {
      out.kidsTarget = Number(argv[++i]);
    } else if (a === "--out" && argv[i + 1]) {
      out.out = argv[++i];
    }
  }
  return out;
}
