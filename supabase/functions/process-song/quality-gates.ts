// Quality gates for the bulk importer + per-request edge function.
// Runtime-agnostic — no Deno or Node imports. Lives next to the edge function
// so deno deploy picks it up; the importer copies this file at build time
// (see scripts/sync-quality-gates.cjs).

export interface LyricWord {
  chinese: string;
  pinyin: string;
  english: string;
}

export interface LyricLine {
  id: number;
  startTime: number;
  endTime: number;
  chinese: string;
  pinyin: string;
  english: string;
  words: LyricWord[];
}

export type QualityStatus = "pending" | "passed" | "rejected" | "manual_review";

export interface PreCheckInput {
  title: string;
  channelTitle: string;
  durationSec: number | null;
  embeddable: boolean;
  privacyStatus: string;
}

export interface PreCheckResult {
  ok: boolean;
  reasons: string[];
}

export interface PostCheckInput {
  lyrics: LyricLine[];
  lyricsSource: string; // "LRCLIB" | "NetEase" | "YouTube Captions" | "AI Search" | "Pre-translated"
}

export interface PostCheckResult {
  status: QualityStatus;
  score: number;
  reasons: string[];
}

// ─── Pre-check (cheap, before OpenAI) ─────────────────────────────────────
const TITLE_HARD_BLACKLIST =
  /\b(instrumental|karaoke|cover|remix|reaction|reacts|tutorial|piano\s*version|guitar\s*version)\b|伴奏|纯音乐|純音樂|翻唱|教学|教學|二胡版|純樂器|純音樂版/i;

const TITLE_LIVE_PATTERNS = /\blive\s*版\b|演唱会|演唱會|coachella|concert\b/i;

export function preCheck(input: PreCheckInput): PreCheckResult {
  const reasons: string[] = [];
  if (!input.embeddable) reasons.push("not_embeddable");
  if (input.privacyStatus && input.privacyStatus !== "public") {
    reasons.push(`privacy:${input.privacyStatus}`);
  }
  if (input.durationSec != null) {
    if (input.durationSec < 45) reasons.push("too_short");
    if (input.durationSec > 600) reasons.push("too_long");
  }
  if (TITLE_HARD_BLACKLIST.test(input.title)) reasons.push("title_blacklist");
  if (TITLE_LIVE_PATTERNS.test(input.title)) reasons.push("title_live");
  return { ok: reasons.length === 0, reasons };
}

// ─── Post-check (after lyrics are processed) ──────────────────────────────
const CANTONESE_MARKERS = /[嘅嘢啲咗喺嚟冇乜咁佢嗮]/;
const BOILERPLATE = /订阅|訂閱|subscribe|like\s*and\s*share|关注我们|關注我們|本视频|本視頻|歌词来源|歌詞來源|copyright\s*©/i;

function isCJK(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2a6df)
  );
}

function countCJK(s: string): number {
  let n = 0;
  for (const ch of s) if (isCJK(ch)) n++;
  return n;
}

function countNonWhitespace(s: string): number {
  let n = 0;
  for (const ch of s) if (!/\s/.test(ch)) n++;
  return n;
}

const SOURCE_TRUST: Record<string, number> = {
  "LRCLIB": 1.0,
  "NetEase": 0.95,
  "Pre-translated": 0.95,
  "YouTube Captions": 0.7,
  "AI Search": 0.5,
};

export function postCheck(input: PostCheckInput): PostCheckResult {
  const { lyrics, lyricsSource } = input;
  const reasons: string[] = [];

  // ── Hard fails ──
  if (!Array.isArray(lyrics) || lyrics.length === 0) {
    return { status: "rejected", score: 0, reasons: ["empty_lyrics"] };
  }
  if (lyrics.length < 8) reasons.push("too_few_lines");
  if (lyrics.length > 200) reasons.push("too_many_lines");

  const chineseChars = lyrics.reduce((sum, l) => sum + countCJK(l.chinese || ""), 0);
  if (chineseChars < 80) reasons.push("too_little_chinese");

  const lineCJK = lyrics.map((l) => countCJK(l.chinese || ""));
  const meanCJK = lineCJK.reduce((a, b) => a + b, 0) / Math.max(1, lyrics.length);
  if (meanCJK < 3) reasons.push("lines_too_short");
  if (meanCJK > 40) reasons.push("lines_too_long");

  // Per-line non-CJK ratio (avg) — catches videos where "lyrics" are mostly Romaji.
  let nonCJKRatioSum = 0;
  let countedLines = 0;
  for (const l of lyrics) {
    const cjk = countCJK(l.chinese || "");
    const total = countNonWhitespace(l.chinese || "");
    if (total > 0) {
      nonCJKRatioSum += 1 - cjk / total;
      countedLines++;
    }
  }
  const meanNonCJKRatio = countedLines > 0 ? nonCJKRatioSum / countedLines : 1;
  if (meanNonCJKRatio > 0.4) reasons.push("low_chinese_ratio");

  // Pinyin coverage — required for the per-word UI.
  const withPinyin = lyrics.filter((l) => (l.pinyin || "").trim().length > 0).length;
  const pinyinCoverage = withPinyin / lyrics.length;
  if (pinyinCoverage < 0.85) reasons.push("low_pinyin_coverage");

  // English coverage — soft.
  const withEnglish = lyrics.filter((l) => (l.english || "").trim().length > 0).length;
  const englishCoverage = withEnglish / lyrics.length;
  if (englishCoverage < 0.7) reasons.push("low_english_coverage");

  // Duplicate-line ratio — captions stuck on one frame.
  const lineSet = new Set(lyrics.map((l) => (l.chinese || "").trim()));
  const dupRatio = 1 - lineSet.size / lyrics.length;
  if (dupRatio > 0.5) reasons.push("high_duplicate_ratio");

  // Boilerplate.
  for (const l of lyrics) {
    if (BOILERPLATE.test(l.chinese || "") || BOILERPLATE.test(l.english || "")) {
      reasons.push("boilerplate_text");
      break;
    }
  }

  // Cantonese marker → manual_review (soft).
  let cantoSeen = false;
  for (const l of lyrics) {
    if (CANTONESE_MARKERS.test(l.chinese || "")) {
      cantoSeen = true;
      break;
    }
  }

  // ── Score ──
  const sourceTrust = SOURCE_TRUST[lyricsSource] ?? 0.6;
  let score = sourceTrust;
  // Coverage contributions.
  score = score * 0.6 + pinyinCoverage * 0.25 + englishCoverage * 0.15;
  // Penalize each soft reason.
  const softPenalty = Math.min(0.5, reasons.length * 0.07);
  score = Math.max(0, score - softPenalty);

  // ── Verdict ──
  const hardFailKeys = new Set([
    "empty_lyrics",
    "too_few_lines",
    "too_many_lines",
    "too_little_chinese",
    "lines_too_short",
    "lines_too_long",
    "low_chinese_ratio",
    "low_pinyin_coverage",
    "high_duplicate_ratio",
    "boilerplate_text",
  ]);
  const hasHardFail = reasons.some((r) => hardFailKeys.has(r));

  if (hasHardFail) {
    return { status: "rejected", score, reasons };
  }

  // AI-search lyrics are model-synthesized — never auto-publish.
  if (lyricsSource === "AI Search") {
    return { status: "manual_review", score, reasons: [...reasons, "ai_search_source"] };
  }
  if (cantoSeen) {
    return { status: "manual_review", score, reasons: [...reasons, "cantonese_markers"] };
  }

  // Stricter threshold for weaker sources.
  const passThreshold = sourceTrust >= 0.9 ? 0.7 : 0.8;
  if (score >= passThreshold) {
    return { status: "passed", score, reasons };
  }
  return { status: "manual_review", score, reasons };
}
