// LyricLantern — process-song Edge Function
// Pipeline: YouTube metadata → LRCLIB synced lyrics → OpenAI GPT-4o-mini → cache in Supabase
//
// Supabase secrets required:
//   OPENAI_API_KEY   – OpenAI API key
//   YOUTUBE_API_KEY  – YouTube Data API v3 key
//   SUPABASE_URL     – auto-provided by Supabase
//   SUPABASE_SERVICE_ROLE_KEY – auto-provided by Supabase

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS headers ───────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────
interface LyricWord {
  chinese: string;
  pinyin: string;
  english: string;
}

interface LyricLine {
  id: number;
  startTime: number;
  endTime: number;
  chinese: string;
  pinyin: string;
  english: string;
  words: LyricWord[];
}

// ─── 1. Fetch YouTube metadata ──────────────────────────────────────────────
async function fetchYouTubeMetadata(
  videoId: string,
  apiKey: string
): Promise<{ title: string; artist: string; thumbnailUrl: string }> {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
  const res = await fetch(url);

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`YouTube API error (${res.status}):`, errBody);
    throw new Error(`YouTube API error ${res.status}: ${errBody.substring(0, 200)}`);
  }

  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error("Video not found on YouTube");
  }

  const snippet = data.items[0].snippet;
  return {
    title: snippet.title || "Unknown Song",
    artist: snippet.channelTitle || "Unknown Artist",
    thumbnailUrl:
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      "",
  };
}

// ─── 2. Fetch synced lyrics from LRCLIB ─────────────────────────────────────

// Extract the song name from various YouTube title formats
// e.g. "周杰倫 Jay Chou【晴天 Sunny Day】-Official Music Video" → "晴天"
function extractSongName(title: string, artist: string): string[] {
  const candidates: string[] = [];

  // 1. Extract text from CJK brackets: 【...】〈...〉《...》
  const cjkBracketMatch = title.match(/[【《〈](.+?)[】》〉]/);
  if (cjkBracketMatch) {
    const insideBrackets = cjkBracketMatch[1].trim();
    candidates.push(insideBrackets);
    // If it contains both Chinese and English (e.g. "晴天 Sunny Day"), extract just the Chinese part
    const chinesePart = insideBrackets.replace(/[a-zA-Z\s'-]+$/g, "").trim();
    if (chinesePart && chinesePart !== insideBrackets) {
      candidates.push(chinesePart);
    }
    // Also try just the English part
    const englishPart = insideBrackets.replace(/[\u4e00-\u9fff\u3400-\u4dbf\s]+/g, "").trim();
    if (englishPart && englishPart !== insideBrackets) {
      candidates.push(englishPart);
    }
  }

  // 2. Clean the full title: remove ALL bracket types and their contents
  const cleaned = title
    .replace(/\s*[【《〈\(\[\{].*?[】》〉\)\]\}]\s*/g, " ")
    .replace(/\s*[-–—]\s*official\s*(mv|music\s*video|video|audio|lyric\s*video).*$/gi, "")
    .replace(/\s*official\s*(mv|music\s*video|video|audio|lyric\s*video)\s*/gi, "")
    .replace(/\s*[-–—]\s*MV\s*$/gi, "")
    .replace(/\s*MV\s*$/g, "")
    .trim();

  // 3. Remove artist name prefix from the cleaned title
  if (artist) {
    // Try removing the artist name (and common separators) from the start
    const artistVariants = [artist];
    // Also try just the Chinese part of the artist name
    const artistChinese = artist.replace(/[a-zA-Z\s'-]+/g, "").trim();
    if (artistChinese) artistVariants.push(artistChinese);
    // Also try just the English part
    const artistEnglish = artist.replace(/[\u4e00-\u9fff\u3400-\u4dbf\s]+/g, "").trim();
    if (artistEnglish) artistVariants.push(artistEnglish);

    for (const av of artistVariants) {
      if (cleaned.toLowerCase().startsWith(av.toLowerCase())) {
        const remainder = cleaned.substring(av.length).replace(/^\s*[-–—:：]\s*/, "").trim();
        if (remainder) candidates.push(remainder);
      }
    }
  }

  if (cleaned) candidates.push(cleaned);

  // Deduplicate while preserving order
  return [...new Set(candidates)].filter(c => c.length > 0);
}

// Clean artist name for LRCLIB search
function cleanArtistName(artist: string): string[] {
  const variants: string[] = [artist];
  // Chinese part only (e.g. "周杰倫")
  const chinese = artist.replace(/[a-zA-Z\s'-]+/g, "").trim();
  if (chinese && chinese !== artist) variants.push(chinese);
  // English part only (e.g. "Jay Chou")
  const english = artist.replace(/[\u4e00-\u9fff\u3400-\u4dbf]+/g, "").trim();
  if (english && english !== artist) variants.push(english);
  return variants;
}

async function fetchLRCLyrics(
  title: string,
  artist: string
): Promise<string | null> {
  const songNames = extractSongName(title, artist);
  const artistVariants = cleanArtistName(artist);

  console.log("LRCLIB search - song name candidates:", songNames);
  console.log("LRCLIB search - artist variants:", artistVariants);

  // Build a prioritized list of queries (best matches first, max ~6)
  const queries: Record<string, string>[] = [];

  // Priority 1: Chinese title from brackets + each artist variant (most likely to match)
  const bestSongName = songNames[0]; // First candidate is usually from CJK brackets
  if (bestSongName) {
    for (const artistName of artistVariants.slice(0, 3)) {
      queries.push({ track_name: bestSongName, artist_name: artistName });
    }
  }

  // Priority 2: If there's a Chinese-only title (e.g. "晴天" from "晴天 Sunny Day"), try it
  if (songNames[1] && songNames[1] !== bestSongName) {
    queries.push({ track_name: songNames[1], artist_name: artistVariants[artistVariants.length - 1] || artist });
  }

  // Priority 3: Best song name without artist (broadest search)
  if (bestSongName) {
    queries.push({ track_name: bestSongName });
  }

  // Priority 4: Full cleaned title as fallback
  const lastCandidate = songNames[songNames.length - 1];
  if (lastCandidate && lastCandidate !== bestSongName) {
    queries.push({ track_name: lastCandidate, artist_name: artistVariants[0] });
  }

  for (const query of queries) {
    const params = new URLSearchParams(query);
    const url = `https://lrclib.net/api/search?${params}`;

    try {
      console.log(`LRCLIB searching: ${params.toString()}`);
      const res = await fetch(url, {
        headers: { "User-Agent": "LyricLantern/1.0" },
      });

      if (!res.ok) continue;

      const results = await res.json();

      // Find a result with synced lyrics
      for (const result of results) {
        if (result.syncedLyrics) {
          console.log(`LRCLIB match: "${result.trackName}" by ${result.artistName}`);
          return result.syncedLyrics;
        }
      }
    } catch (e) {
      console.warn("LRCLIB search failed for query:", query, e);
    }
  }

  return null;
}

// ─── 3. Parse LRC format into timed lines ───────────────────────────────────
function parseLRC(lrc: string): { time: number; text: string }[] {
  const lines: { time: number; text: string }[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/;

  for (const line of lrc.split("\n")) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = match[3].length === 2
        ? parseInt(match[3], 10) * 10
        : parseInt(match[3], 10);
      const time = minutes * 60 + seconds + ms / 1000;
      const text = match[4].trim();

      if (text) {
        lines.push({ time, text });
      }
    }
  }

  return lines;
}

// ─── 4. Check if text contains Chinese characters ───────────────────────────
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
}

// ─── 5. Process lyrics with OpenAI GPT-4o-mini ─────────────────────────────

const OPENAI_SYSTEM_PROMPT = `You are a Chinese language assistant. You will be given numbered lines of Chinese song lyrics. For each line, return a JSON array where each element has this structure:

{"lineNumber":<number>,"chinese":"<original>","pinyin":"<pinyin with tone marks>","english":"<translation>","words":[{"chinese":"<word>","pinyin":"<pinyin>","english":"<meaning>"}]}

Rules:
- Segment into meaningful words (not individual characters when they form a word)
- Use tone marks (ā á ǎ à), NOT tone numbers
- The words array must cover every character — no gaps
- Natural English translations, concise definitions (2-5 words)
- Return ONLY a valid JSON array, no markdown`;

async function callOpenAIBatch(
  lines: { index: number; text: string }[],
  apiKey: string
): Promise<any[]> {
  const numberedLyrics = lines
    .map((l) => `${l.index}. ${l.text}`)
    .join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: OPENAI_SYSTEM_PROMPT },
        { role: "user", content: numberedLyrics },
      ],
      temperature: 0.2,
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("OpenAI API error:", errText);
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) return [];

  try {
    const cleaned = content
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse OpenAI batch response:", content.substring(0, 200));
    return [];
  }
}

async function processWithOpenAI(
  timedLines: { time: number; text: string }[],
  apiKey: string
): Promise<LyricLine[]> {
  // Filter to only Chinese lines
  const chineseLines = timedLines.filter((l) => containsChinese(l.text));

  if (chineseLines.length === 0) {
    throw new Error("No Chinese lyrics found in this song");
  }

  console.log(`Processing ${chineseLines.length} Chinese lines with OpenAI...`);

  // Split into batches of 12 lines and process in PARALLEL
  const BATCH_SIZE = 12;
  const batches: { index: number; text: string }[][] = [];
  for (let i = 0; i < chineseLines.length; i += BATCH_SIZE) {
    const batch = chineseLines.slice(i, i + BATCH_SIZE).map((line, j) => ({
      index: i + j + 1,
      text: line.text,
    }));
    batches.push(batch);
  }

  console.log(`Split into ${batches.length} parallel batches of up to ${BATCH_SIZE} lines`);

  // Process all batches in parallel
  const batchResults = await Promise.all(
    batches.map((batch) => callOpenAIBatch(batch, apiKey))
  );

  // Merge all batch results into a single array
  const allParsed = batchResults.flat();

  // Map AI output back to timed LyricLine objects
  const lyrics: LyricLine[] = chineseLines.map((line, index) => {
    const lineNum = index + 1;
    const aiLine = allParsed.find((p: any) => p.lineNumber === lineNum) || allParsed[index];

    const nextLine = chineseLines[index + 1];
    const endTime = nextLine ? nextLine.time : line.time + 5;

    return {
      id: lineNum,
      startTime: line.time,
      endTime: endTime,
      chinese: aiLine?.chinese || line.text,
      pinyin: aiLine?.pinyin || "",
      english: aiLine?.english || "",
      words: aiLine?.words || [
        { chinese: line.text, pinyin: "", english: "" },
      ],
    };
  });

  return lyrics;
}

// ─── 6. Fallback: create basic lyrics without AI ────────────────────────────
function createBasicLyrics(
  timedLines: { time: number; text: string }[]
): LyricLine[] {
  const chineseLines = timedLines.filter((l) => containsChinese(l.text));

  return chineseLines.map((line, index) => {
    const nextLine = chineseLines[index + 1];
    const endTime = nextLine ? nextLine.time : line.time + 5;

    return {
      id: index + 1,
      startTime: line.time,
      endTime: endTime,
      chinese: line.text,
      pinyin: "",
      english: "",
      words: [{ chinese: line.text, pinyin: "", english: "" }],
    };
  });
}

// ─── Main handler ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoId, youtubeUrl } = await req.json();

    if (!videoId || typeof videoId !== "string" || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return new Response(
        JSON.stringify({ error: "Invalid video ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get environment variables
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const youtubeKey = Deno.env.get("YOUTUBE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if already cached
    const { data: existing } = await supabase
      .from("songs")
      .select("*")
      .eq("video_id", videoId)
      .single();

    if (existing && Array.isArray(existing.lyrics) && existing.lyrics.length > 0) {
      return new Response(JSON.stringify(existing), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If cached but has empty lyrics, delete the bad entry so we can retry
    if (existing && (!existing.lyrics || existing.lyrics.length === 0)) {
      console.log("Found cached entry with empty lyrics, deleting to retry...");
      await supabase.from("songs").delete().eq("video_id", videoId);
    }

    console.log(`Processing new song: ${videoId}`);

    // Step 1: Get YouTube metadata
    let title = "Unknown Song";
    let artist = "Unknown Artist";
    let thumbnailUrl = "";

    let youtubeError = "";
    if (youtubeKey) {
      try {
        const meta = await fetchYouTubeMetadata(videoId, youtubeKey);
        title = meta.title;
        artist = meta.artist;
        thumbnailUrl = meta.thumbnailUrl;
        console.log(`YouTube metadata: "${title}" by ${artist}`);
      } catch (e) {
        youtubeError = e.message || String(e);
        console.error("YouTube metadata fetch failed:", youtubeError);
      }
    } else {
      youtubeError = "YOUTUBE_API_KEY is not set";
      console.error("YOUTUBE_API_KEY is not set!");
    }

    // If we still don't have a title, we can't search for lyrics
    if (title === "Unknown Song") {
      return new Response(
        JSON.stringify({
          error: `Could not fetch video metadata. ${youtubeError || 'Please check your YOUTUBE_API_KEY.'}`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Fetch synced lyrics from LRCLIB
    let syncedLyrics: string | null = null;
    try {
      syncedLyrics = await fetchLRCLyrics(title, artist);
      if (syncedLyrics) {
        console.log("Found synced lyrics on LRCLIB");
      } else {
        console.log("No synced lyrics found on LRCLIB");
      }
    } catch (e) {
      console.warn("LRCLIB fetch failed:", e);
    }

    if (!syncedLyrics) {
      return new Response(
        JSON.stringify({
          error: "Could not find synced lyrics for this song. Try a different song that has lyrics available on LRCLIB.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Parse LRC into timed lines
    const timedLines = parseLRC(syncedLyrics);
    console.log(`Parsed ${timedLines.length} timed lyric lines`);

    // Step 4: Process with OpenAI (pinyin + translations + word segmentation)
    let lyrics: LyricLine[];
    try {
      lyrics = await processWithOpenAI(timedLines, openaiKey);
      console.log(`AI processed ${lyrics.length} lyric lines`);
    } catch (e) {
      console.warn("OpenAI processing failed, using basic lyrics:", e);
      lyrics = createBasicLyrics(timedLines);
    }

    // Don't cache songs with empty lyrics — something went wrong
    if (!lyrics || lyrics.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No Chinese lyrics could be processed for this song. The lyrics may not contain Chinese characters.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 5: Save to Supabase cache
    const { data: saved, error: saveError } = await supabase.rpc(
      "insert_processed_song",
      {
        p_video_id: videoId,
        p_youtube_url: youtubeUrl || `https://www.youtube.com/watch?v=${videoId}`,
        p_title: title,
        p_artist: artist,
        p_duration_ms: null,
        p_thumbnail: thumbnailUrl,
        p_lyrics: lyrics,
      }
    );

    if (saveError) {
      console.error("Failed to cache song:", saveError);
      // Still return the processed data even if caching fails
      return new Response(
        JSON.stringify({
          video_id: videoId,
          youtube_url: youtubeUrl,
          title,
          artist,
          thumbnail_url: thumbnailUrl,
          lyrics,
          view_count: 1,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = saved?.[0] || {
      video_id: videoId,
      youtube_url: youtubeUrl,
      title,
      artist,
      thumbnail_url: thumbnailUrl,
      lyrics,
      view_count: 0,
    };

    console.log(`Successfully processed and cached: "${title}"`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
