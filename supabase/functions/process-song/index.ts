// LyricLantern — process-song Edge Function
// Pipeline: YouTube metadata → lyrics search (LRCLIB → NetEase → YT captions → AI web search) → OpenAI GPT-4o-mini → cache in Supabase
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

// ─── 2c. Fetch lyrics from NetEase Cloud Music ──────────────────────────────

async function fetchNetEaseLyrics(
  title: string,
  artist: string
): Promise<string | null> {
  const songNames = extractSongName(title, artist);
  const artistVariants = cleanArtistName(artist);

  // Build search queries — try best song name + artist combinations
  const searchQueries: string[] = [];
  const bestName = songNames[0];
  if (bestName) {
    for (const av of artistVariants.slice(0, 2)) {
      searchQueries.push(`${av} ${bestName}`);
    }
    searchQueries.push(bestName);
  }
  // Also try Chinese-only song name if available
  if (songNames[1] && songNames[1] !== bestName) {
    searchQueries.push(songNames[1]);
  }

  for (const query of searchQueries) {
    try {
      console.log(`NetEase searching: "${query}"`);
      const searchRes = await fetch("http://music.163.com/api/search/get/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Referer": "http://music.163.com",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Cookie": "appver=2.0.2;",
        },
        body: `s=${encodeURIComponent(query)}&type=1&limit=5&offset=0`,
      });

      if (!searchRes.ok) {
        console.warn(`NetEase search HTTP ${searchRes.status}`);
        continue;
      }

      const searchData = await searchRes.json();
      const songs = searchData?.result?.songs;
      if (!songs || songs.length === 0) continue;

      // Try each search result for lyrics
      for (const song of songs.slice(0, 3)) {
        try {
          const lyricRes = await fetch(
            `http://music.163.com/api/song/lyric?os=osx&id=${song.id}&lv=-1&kv=-1&tv=-1`,
            {
              headers: {
                "Referer": "http://music.163.com",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              },
            }
          );

          if (!lyricRes.ok) continue;

          const lyricData = await lyricRes.json();
          const lrcContent = lyricData?.lrc?.lyric;

          if (lrcContent && lrcContent.includes("[") && containsChinese(lrcContent)) {
            console.log(`NetEase match: "${song.name}" by ${song.artists?.map((a: any) => a.name).join(", ")} (id: ${song.id})`);
            return lrcContent;
          }
        } catch (e) {
          console.warn(`NetEase lyric fetch failed for song ${song.id}:`, e);
        }
      }
    } catch (e) {
      console.warn("NetEase search failed:", e);
    }
  }

  console.log("No lyrics found on NetEase");
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

// ─── 2b. Fetch lyrics from YouTube captions (fallback) ──────────────────────

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/\n/g, " ")
    .trim();
}

function parseTimedTextXML(xml: string): { time: number; text: string }[] {
  const lines: { time: number; text: string }[] = [];
  const regex = /<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const time = parseFloat(match[1]);
    const text = decodeHTMLEntities(match[3]);
    if (text) {
      lines.push({ time, text });
    }
  }
  return lines;
}

async function fetchYouTubeCaptions(
  videoId: string
): Promise<{ time: number; text: string }[] | null> {
  try {
    // Fetch the YouTube video page to extract caption track URLs
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
    });

    if (!res.ok) {
      console.warn(`YouTube page fetch failed: ${res.status}`);
      return null;
    }

    const html = await res.text();

    // Extract captionTracks from ytInitialPlayerResponse
    const playerMatch = html.match(
      /ytInitialPlayerResponse\s*=\s*(\{.+?\});/s
    );
    if (!playerMatch) {
      console.warn("Could not find ytInitialPlayerResponse in page");
      return null;
    }

    let playerData: any;
    try {
      playerData = JSON.parse(playerMatch[1]);
    } catch {
      console.warn("Failed to parse ytInitialPlayerResponse JSON");
      return null;
    }

    const captionTracks =
      playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captionTracks || captionTracks.length === 0) {
      console.log("No caption tracks found for this video");
      return null;
    }

    console.log(
      `Found ${captionTracks.length} caption tracks:`,
      captionTracks.map((t: any) => `${t.languageCode} (${t.kind || "manual"})`)
    );

    // Priority order for Chinese captions
    const zhCodes = ["zh", "zh-Hans", "zh-CN", "zh-Hant", "zh-TW"];

    // Priority 1: Manual Chinese captions
    let track = captionTracks.find(
      (t: any) => zhCodes.includes(t.languageCode) && t.kind !== "asr"
    );

    // Priority 2: Auto-generated Chinese captions
    if (!track) {
      track = captionTracks.find(
        (t: any) => zhCodes.includes(t.languageCode) && t.kind === "asr"
      );
    }

    // Priority 3: Any caption track that might contain Chinese (e.g. "und" or default)
    if (!track) {
      track = captionTracks.find(
        (t: any) => t.kind !== "asr" && !["en", "es", "fr", "de", "ja", "ko", "pt", "ru"].includes(t.languageCode)
      );
    }

    // Priority 4: Auto-generated in any language (we'll filter for Chinese content later)
    if (!track) {
      track = captionTracks.find((t: any) => t.kind === "asr");
    }

    if (!track) {
      console.log("No suitable caption track found");
      return null;
    }

    console.log(
      `Using caption track: ${track.languageCode} (${track.kind || "manual"})`
    );

    // Fetch the caption XML
    const captionUrl = track.baseUrl + "&fmt=srv3";
    const captionRes = await fetch(captionUrl);
    if (!captionRes.ok) {
      console.warn(`Caption fetch failed: ${captionRes.status}`);
      return null;
    }

    const captionXml = await captionRes.text();
    const lines = parseTimedTextXML(captionXml);

    if (lines.length === 0) {
      console.log("No lines parsed from caption XML");
      return null;
    }

    // Filter to only lines containing Chinese characters
    const chineseLines = lines.filter((l) =>
      /[\u4e00-\u9fff\u3400-\u4dbf]/.test(l.text)
    );

    if (chineseLines.length === 0) {
      console.log(
        `Parsed ${lines.length} caption lines but none contain Chinese characters`
      );
      return null;
    }

    console.log(
      `Parsed ${chineseLines.length} Chinese caption lines from YouTube`
    );
    return chineseLines;
  } catch (e) {
    console.warn("YouTube captions fetch error:", e);
    return null;
  }
}

// ─── 2d. AI web search for lyrics (last resort) ─────────────────────────────

async function fetchLyricsViaAI(
  title: string,
  artist: string,
  apiKey: string
): Promise<{ time: number; text: string }[] | null> {
  try {
    const songNames = extractSongName(title, artist);
    const bestName = songNames[0] || title;
    const artistClean = cleanArtistName(artist)[0] || artist;

    console.log(`AI web search for lyrics: "${bestName}" by ${artistClean}`);

    const prompt = `Find the complete Chinese lyrics for the song "${bestName}" by ${artistClean}.

Return ONLY the Chinese lyrics text, one line per line. Do not include:
- Translations or pinyin
- Song metadata (writer, composer, etc.)
- Section headers like [Chorus], [Verse], etc.
- Any explanation or commentary

If you cannot find the lyrics, respond with exactly: NOT_FOUND`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a lyrics search assistant. You have extensive knowledge of Chinese songs and their lyrics. When asked for lyrics, provide the complete Chinese lyrics text only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      console.warn(`AI lyrics search HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content || content === "NOT_FOUND" || content.includes("NOT_FOUND")) {
      console.log("AI could not find lyrics");
      return null;
    }

    // Check that the response actually contains Chinese characters
    if (!containsChinese(content)) {
      console.log("AI response does not contain Chinese characters");
      return null;
    }

    // Split into lines and create untimed entries (time=0 for all)
    const lines = content
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0 && containsChinese(l));

    if (lines.length < 3) {
      console.log(`AI returned only ${lines.length} Chinese lines, too few`);
      return null;
    }

    // Create timed lines with even spacing (no real timing, but maintains structure)
    const timedLines = lines.map((text: string, i: number) => ({
      time: i * 4, // ~4 seconds per line as placeholder
      text,
    }));

    console.log(`AI found ${timedLines.length} lyrics lines`);
    return timedLines;
  } catch (e) {
    console.warn("AI lyrics search error:", e);
    return null;
  }
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

    // Step 2: Multi-source lyrics search (LRCLIB → NetEase → YouTube Captions → AI)
    let timedLines: { time: number; text: string }[] | null = null;
    let lyricsSource = "unknown";

    // Source 1: LRCLIB
    try {
      const syncedLyrics = await fetchLRCLyrics(title, artist);
      if (syncedLyrics) {
        timedLines = parseLRC(syncedLyrics);
        lyricsSource = "LRCLIB";
        console.log(`Found ${timedLines.length} timed lines from LRCLIB`);
      } else {
        console.log("No synced lyrics found on LRCLIB");
      }
    } catch (e) {
      console.warn("LRCLIB fetch failed:", e);
    }

    // Source 2: NetEase Cloud Music
    if (!timedLines || timedLines.length === 0) {
      try {
        const neteaseLyrics = await fetchNetEaseLyrics(title, artist);
        if (neteaseLyrics) {
          timedLines = parseLRC(neteaseLyrics);
          lyricsSource = "NetEase";
          console.log(`Found ${timedLines.length} timed lines from NetEase`);
        }
      } catch (e) {
        console.warn("NetEase fetch failed:", e);
      }
    }

    // Source 3: YouTube Captions
    if (!timedLines || timedLines.length === 0) {
      console.log("Trying YouTube captions as fallback...");
      try {
        const captionLines = await fetchYouTubeCaptions(videoId);
        if (captionLines && captionLines.length > 0) {
          timedLines = captionLines;
          lyricsSource = "YouTube Captions";
          console.log(`Found ${timedLines.length} lines from YouTube captions`);
        }
      } catch (e) {
        console.warn("YouTube captions fetch failed:", e);
      }
    }

    // Source 4: AI web search (last resort — uses OpenAI to find lyrics by title/artist)
    if (!timedLines || timedLines.length === 0) {
      console.log("Trying AI lyrics search as last resort...");
      try {
        const aiLines = await fetchLyricsViaAI(title, artist, openaiKey);
        if (aiLines && aiLines.length > 0) {
          timedLines = aiLines;
          lyricsSource = "AI Search";
          console.log(`Found ${timedLines.length} lines via AI search`);
        }
      } catch (e) {
        console.warn("AI lyrics search failed:", e);
      }
    }

    // If all sources failed, return 404
    if (!timedLines || timedLines.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Could not find lyrics for this song from any source.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Using lyrics from: ${lyricsSource} (${timedLines.length} lines)`);

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
