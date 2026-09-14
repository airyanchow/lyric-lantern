// LyricLantern — generate-word-details Edge Function
// Two modes:
//   1. Single word: full details (POS + example sentence)
//   2. Batch POS: just part of speech for up to 30 words at once
//
// Supabase secrets required:
//   OPENAI_API_KEY
//   SUPABASE_URL (auto-provided)
//   SUPABASE_SERVICE_ROLE_KEY (auto-provided)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callOpenAI(
  openaiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 300,
  temperature = 0.2
) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("OpenAI error:", errText);
    return null;
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  try {
    const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    console.error("Failed to parse AI response:", content);
    return null;
  }
}

// ─── Batch POS handler ────────────────────────────────────────────────────────
async function handleBatchPos(
  words: { id: string; chinese: string; pinyin?: string; english?: string }[],
  openaiKey: string
) {
  const wordList = words
    .map((w, i) => `${i + 1}. ${w.chinese} (${w.pinyin || "?"} — ${w.english || "?"})`)
    .join("\n");

  const prompt = `For each Chinese word below, provide ONLY its part of speech.
Use one of: noun, verb, adjective, adverb, pronoun, preposition, conjunction, particle, measure word, interjection, auxiliary verb, phrase.

Words:
${wordList}

Return ONLY a valid JSON array where each element has "index" (1-based) and "part_of_speech" (lowercase). Example:
[{"index":1,"part_of_speech":"noun"},{"index":2,"part_of_speech":"verb"}]`;

  const result = await callOpenAI(
    openaiKey,
    "You are a Chinese language expert. Return only valid JSON, no markdown.",
    prompt,
    words.length * 40
  );

  if (!Array.isArray(result)) return null;

  const mapped: Record<string, string> = {};
  for (const item of result) {
    const idx = (item.index ?? item.i) - 1;
    if (idx >= 0 && idx < words.length && item.part_of_speech) {
      mapped[words[idx].id] = item.part_of_speech.toLowerCase();
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  const updates = Object.entries(mapped).map(([id, pos]) =>
    sb.from("saved_vocabulary").update({ part_of_speech: pos }).eq("id", id)
  );
  await Promise.allSettled(updates);

  return mapped;
}

// ─── Single word handler (example sentence) ───────────────────────────────────
async function handleSingleWord(
  wordId: string,
  chinese: string,
  pinyin: string | undefined,
  english: string | undefined,
  openaiKey: string,
  regenerate = false
) {
  const regenerateNote = regenerate
    ? "\n- IMPORTANT: Generate a DIFFERENT example sentence than any previous one. Be creative and varied."
    : "";

  const prompt = `For the Chinese word "${chinese}" (pinyin: ${pinyin || "unknown"}, meaning: ${english || "unknown"}), provide:
1. The part of speech (one of: noun, verb, adjective, adverb, pronoun, preposition, conjunction, particle, measure word, interjection, auxiliary verb, phrase)
2. One natural example sentence using this word

Return ONLY valid JSON in this exact format:
{
  "part_of_speech": "<part of speech in English, lowercase>",
  "example_chinese": "<example sentence in Chinese characters>",
  "example_pinyin": "<example sentence in pinyin with tone marks ā á ǎ à ē é ě è ī í ǐ ì ō ó ǒ ò ū ú ǔ ù ǖ ǘ ǚ ǜ>",
  "example_english": "<English translation of the example sentence>"
}

Requirements:
- The example sentence should be simple (HSK 1-3 level), natural, and clearly demonstrate the word's usage
- Use tone marks in pinyin, not numbers
- Keep the sentence under 15 characters in Chinese
- The part of speech should be lowercase${regenerateNote}`;

  // Use higher temperature for regeneration to get varied results
  const temperature = regenerate ? 0.8 : 0.2;

  const details = await callOpenAI(
    openaiKey,
    "You are a Chinese language expert. Return only valid JSON, no markdown formatting.",
    prompt,
    300,
    temperature
  );

  if (!details) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  await sb
    .from("saved_vocabulary")
    .update({
      part_of_speech: details.part_of_speech || null,
      example_chinese: details.example_chinese || null,
      example_pinyin: details.example_pinyin || null,
      example_english: details.example_english || null,
    })
    .eq("id", wordId);

  return details;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return jsonResponse({ error: "OpenAI API key not configured" }, 500);
    }

    // ── Batch POS mode ──
    if (body.mode === "batch-pos" && Array.isArray(body.words)) {
      const words = body.words.slice(0, 30);
      if (words.length === 0) return jsonResponse({ results: {} });

      const results = await handleBatchPos(words, openaiKey);
      if (!results) return jsonResponse({ error: "Failed to generate POS" }, 500);

      return jsonResponse({ results });
    }

    // ── Quick lookup mode (pinyin + english for a character/word) ──
    if (body.mode === "lookup" && body.chinese) {
      const lookupPrompt = `For the Chinese word/character "${body.chinese}", provide its pinyin (with tone marks ā á ǎ à ē é ě è ī í ǐ ì ō ó ǒ ò ū ú ǔ ù ǖ ǘ ǚ ǜ) and a concise English meaning (2-5 words).

Return ONLY valid JSON: {"pinyin":"<pinyin>","english":"<meaning>"}`;

      const result = await callOpenAI(
        openaiKey,
        "You are a Chinese dictionary. Return only valid JSON, no markdown.",
        lookupPrompt,
        100
      );

      if (!result) return jsonResponse({ error: "Lookup failed" }, 500);
      return jsonResponse({ pinyin: result.pinyin || "", english: result.english || "" });
    }

    // ── Single word mode (full details) ──
    const { wordId, chinese, pinyin, english, regenerate } = body;
    if (!wordId || !chinese) {
      return jsonResponse({ error: "wordId and chinese are required" }, 400);
    }

    const details = await handleSingleWord(wordId, chinese, pinyin, english, openaiKey, !!regenerate);
    if (!details) return jsonResponse({ error: "Failed to generate word details" }, 500);

    return jsonResponse({
      part_of_speech: details.part_of_speech,
      example_chinese: details.example_chinese,
      example_pinyin: details.example_pinyin,
      example_english: details.example_english,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
