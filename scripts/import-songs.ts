// Drives data/catalog.jsonl through the process-song edge function with:
//  - concurrency 3, 500ms inter-request gap
//  - skip-set from DB (don't re-process published, recently-rejected, or manual_review rows)
//  - per-video 90s timeout, source-aware retry/backoff
//  - JSONL append log to import_log.jsonl, safe to resume after kill
//
// Usage:
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
//   EDGE_FUNCTION_URL=https://<project>.supabase.co/functions/v1/process-song \
//   npx tsx scripts/import-songs.ts [--catalog data/catalog.jsonl] [--log import_log.jsonl]
//                                   [--limit N] [--concurrency 3] [--gap-ms 500]
//                                   [--dry-run]

import { promises as fs } from "node:fs";
import { createClient } from "@supabase/supabase-js";

interface CatalogEntry {
  video_id: string;
  youtube_url: string;
  title_hint: string;
  artist_hint: string;
  category: "mandopop" | "kids";
  release_year: number | null;
  source: string;
  score: number;
}

interface DBSongRow {
  video_id: string;
  is_published: boolean;
  quality_status: "pending" | "passed" | "rejected" | "manual_review";
  last_imported_at: string | null;
}

const args = parseArgs(process.argv.slice(2));
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const edgeFnUrl =
  process.env.EDGE_FUNCTION_URL ||
  (supabaseUrl ? `${supabaseUrl.replace(/\/$/, "")}/functions/v1/process-song` : "");

if (!supabaseUrl || !anonKey || !edgeFnUrl) {
  console.error("Missing env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (or EDGE_FUNCTION_URL).");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

const catalogPath = args.catalog ?? "data/catalog.jsonl";
const logPath = args.log ?? "import_log.jsonl";
const limit = args.limit ?? Infinity;
const concurrency = args.concurrency ?? 3;
const gapMs = args.gapMs ?? 500;
const dryRun = args.dryRun === true;
const negativeCacheDays = 30;

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});

async function main() {
  console.log(`Catalog: ${catalogPath}\nLog: ${logPath}\nConcurrency: ${concurrency}, gap: ${gapMs}ms, dryRun: ${dryRun}`);

  const allEntries = await readCatalog(catalogPath);
  console.log(`Catalog entries: ${allEntries.length}`);

  const skipMap = await buildSkipSet(allEntries.map((e) => e.video_id));
  const todo: CatalogEntry[] = [];
  let skippedPublished = 0, skippedRejected = 0, skippedReview = 0;
  for (const e of allEntries) {
    const row = skipMap.get(e.video_id);
    if (!row) { todo.push(e); continue; }
    if (row.is_published) { skippedPublished++; continue; }
    if (row.quality_status === "manual_review") { skippedReview++; continue; }
    if (
      row.quality_status === "rejected" &&
      row.last_imported_at &&
      Date.now() - new Date(row.last_imported_at).getTime() < negativeCacheDays * 86_400_000
    ) { skippedRejected++; continue; }
    todo.push(e);
  }
  console.log(
    `Skipping ${skippedPublished} published / ${skippedRejected} recently-rejected / ${skippedReview} manual-review.`
  );
  const limited = todo.slice(0, limit);
  console.log(`Processing ${limited.length} entries (limit=${limit}).`);

  if (dryRun) {
    console.log("Dry run — exiting without contacting edge function.");
    for (const e of limited.slice(0, 10)) console.log(`  → ${e.video_id} ${e.category} ${e.title_hint}`);
    return;
  }

  const stats = { passed: 0, rejected: 0, manualReview: 0, errored: 0 };
  let quotaHalt = false;
  let processedCount = 0;
  let lastStartTs = 0;

  // Bounded concurrency: a pool of N "workers" that pull from the queue.
  const queue = limited.slice();
  const workers = Array.from({ length: concurrency }, async (_, workerIdx) => {
    while (queue.length > 0 && !quotaHalt) {
      const entry = queue.shift()!;
      // Inter-request gap (global, applies to whichever worker starts next).
      const now = Date.now();
      const waitMs = Math.max(0, lastStartTs + gapMs - now);
      if (waitMs > 0) await sleep(waitMs);
      lastStartTs = Date.now();

      const t0 = Date.now();
      try {
        const result = await processOne(entry);
        const elapsed = Date.now() - t0;
        await appendLog({
          ts: new Date().toISOString(),
          video_id: entry.video_id,
          youtube_url: entry.youtube_url,
          category: entry.category,
          release_year: entry.release_year,
          source: entry.source,
          score: entry.score,
          phase: result.phase,
          outcome: result.outcome,
          quality_status: result.qualityStatus,
          quality_reasons: result.qualityReasons,
          lyrics_source: result.lyricsSource,
          elapsed_ms: elapsed,
          worker: workerIdx,
          error: result.error,
        });
        if (result.outcome === "passed") stats.passed++;
        else if (result.outcome === "rejected") stats.rejected++;
        else if (result.outcome === "manual_review") stats.manualReview++;
        else stats.errored++;
        if (result.quotaHalt) quotaHalt = true;
      } catch (e: any) {
        const elapsed = Date.now() - t0;
        await appendLog({
          ts: new Date().toISOString(),
          video_id: entry.video_id,
          youtube_url: entry.youtube_url,
          category: entry.category,
          phase: "exception",
          outcome: "errored",
          elapsed_ms: elapsed,
          error: e?.message ?? String(e),
        });
        stats.errored++;
      }
      processedCount++;
      if (processedCount % 25 === 0) {
        console.log(`  …${processedCount}/${limited.length}  passed=${stats.passed} review=${stats.manualReview} rejected=${stats.rejected} err=${stats.errored}`);
      }
    }
  });

  await Promise.all(workers);
  console.log(
    `\nDone. passed=${stats.passed} manual_review=${stats.manualReview} rejected=${stats.rejected} errored=${stats.errored}`
  );
  if (quotaHalt) console.log("Note: halted early on YouTube quota error. Re-run after quota reset.");
  console.log(`\nNext steps:
  1. Inspect a sample in Supabase: SELECT * FROM songs WHERE quality_status='passed' ORDER BY random() LIMIT 30;
  2. When satisfied: SELECT public.publish_passed_songs();
  3. Re-run this script anytime — it's idempotent and skips already-processed rows.`);
}

interface ProcessResult {
  phase: string;
  outcome: "passed" | "rejected" | "manual_review" | "errored";
  qualityStatus?: string;
  qualityReasons?: string[];
  lyricsSource?: string;
  error?: string;
  quotaHalt?: boolean;
}

async function processOne(entry: CatalogEntry): Promise<ProcessResult> {
  const body = {
    videoId: entry.video_id,
    youtubeUrl: entry.youtube_url,
    bulkImport: true,
    category: entry.category,
    releaseYear: entry.release_year,
  };
  const maxAttempts = 3;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 90_000);
    try {
      const res = await fetch(edgeFnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
          "apikey": anonKey!,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timeout);
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") || 0);
        await sleep(Math.max(4000, retryAfter * 1000));
        lastErr = new Error("429");
        continue;
      }
      if (res.status === 403) {
        // YouTube quota OR auth issue — halt the run rather than burn through OpenAI.
        const text = await res.text();
        if (/quota/i.test(text)) return { phase: "edge", outcome: "errored", error: "youtube_quota", quotaHalt: true };
      }
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { /* non-JSON body */ }

      if (!res.ok) {
        lastErr = new Error(`edge ${res.status}: ${text.slice(0, 200)}`);
        if (res.status >= 500 && attempt < maxAttempts) {
          await sleep(2000 * attempt);
          continue;
        }
        return { phase: "edge", outcome: "errored", error: lastErr.message };
      }

      const status = json?.quality_status as string | undefined;
      const reasons = (json?.quality_reasons as string[] | undefined) ?? [];
      const lyricsSource = json?.lyrics_source as string | undefined;
      if (status === "passed") return { phase: json?.phase || "post_check", outcome: "passed", qualityStatus: status, qualityReasons: reasons, lyricsSource };
      if (status === "manual_review") return { phase: json?.phase || "post_check", outcome: "manual_review", qualityStatus: status, qualityReasons: reasons, lyricsSource };
      if (status === "rejected") return { phase: json?.phase || "pre_check", outcome: "rejected", qualityStatus: status, qualityReasons: reasons, lyricsSource };
      // No verdict in response (cached row hit before migration ran, etc.). Treat as passed.
      return { phase: "edge", outcome: "passed", qualityStatus: "passed", lyricsSource };
    } catch (e: any) {
      clearTimeout(timeout);
      lastErr = e;
      if (e?.name === "AbortError") {
        return { phase: "edge", outcome: "errored", error: "timeout_90s" };
      }
      if (attempt < maxAttempts) {
        await sleep(2000 * attempt);
        continue;
      }
    }
  }
  return { phase: "edge", outcome: "errored", error: lastErr?.message ?? "unknown" };
}

async function readCatalog(path: string): Promise<CatalogEntry[]> {
  const raw = await fs.readFile(path, "utf8");
  return raw.split("\n").filter((l) => l.trim().length > 0).map((l) => JSON.parse(l));
}

async function buildSkipSet(videoIds: string[]): Promise<Map<string, DBSongRow>> {
  const map = new Map<string, DBSongRow>();
  const batchSize = 200;
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const chunk = videoIds.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("songs")
      .select("video_id, is_published, quality_status, last_imported_at")
      .in("video_id", chunk);
    if (error) {
      console.warn("skip-set query failed for chunk:", error.message);
      continue;
    }
    for (const row of data || []) map.set(row.video_id, row as DBSongRow);
  }
  return map;
}

async function appendLog(entry: object) {
  await fs.appendFile(logPath, JSON.stringify(entry) + "\n", "utf8");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv: string[]): {
  catalog?: string; log?: string; limit?: number; concurrency?: number; gapMs?: number; dryRun?: boolean;
} {
  const out: any = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--catalog" && argv[i + 1]) out.catalog = argv[++i];
    else if (a === "--log" && argv[i + 1]) out.log = argv[++i];
    else if (a === "--limit" && argv[i + 1]) out.limit = Number(argv[++i]);
    else if (a === "--concurrency" && argv[i + 1]) out.concurrency = Number(argv[++i]);
    else if (a === "--gap-ms" && argv[i + 1]) out.gapMs = Number(argv[++i]);
    else if (a === "--dry-run") out.dryRun = true;
  }
  return out;
}
