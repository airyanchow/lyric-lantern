import { useState, useEffect } from 'react';
import { Sparkles, BookmarkPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useVocabulary } from '../hooks/useVocabulary';

interface DailyWordData {
  chinese: string;
  pinyin: string;
  english: string;
  songTitle: string;
  songId: string;
}

export default function DailyWord() {
  const { user } = useAuth();
  const { saveWord } = useVocabulary();
  const [word, setWord] = useState<DailyWordData | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Deterministic daily pick based on date hash
    const today = new Date().toISOString().slice(0, 10);
    const hash = Array.from(today).reduce((acc, c) => acc + c.charCodeAt(0), 0);

    supabase
      .from('songs')
      .select('id, title, lyrics')
      .eq('is_published', true)
      .not('lyrics', 'is', null)
      .limit(50)
      .then(({ data }) => {
        if (!data || data.length === 0) return;

        // Regex to verify a string contains at least one Chinese character
        const hasChinese = (s: string) => /[\u4e00-\u9fff]/.test(s);

        // Collect all valid Chinese words across all songs
        const candidates: { chinese: string; pinyin: string; english: string; songTitle: string; songId: string }[] = [];
        for (const song of data) {
          const lyrics = song.lyrics as any[];
          if (!lyrics) continue;
          for (const line of lyrics) {
            if (!line.words) continue;
            for (const w of line.words) {
              if (w.chinese && w.pinyin && w.english && hasChinese(w.chinese) && w.chinese.length >= 1) {
                candidates.push({
                  chinese: w.chinese,
                  pinyin: w.pinyin,
                  english: w.english,
                  songTitle: song.title,
                  songId: song.id,
                });
              }
            }
          }
        }

        if (candidates.length === 0) return;

        // Deterministic pick from all valid candidates
        const picked = candidates[hash % candidates.length];
        setWord(picked);
      });
  }, []);

  const handleSave = async () => {
    if (!word || !user) return;
    await saveWord({ chinese: word.chinese, pinyin: word.pinyin, english: word.english }, word.songTitle);
    setSaved(true);
  };

  if (!word) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-china-red/30 bg-bg-card px-4 py-3 shadow-lg shadow-china-red/5 sm:px-5 sm:py-4">
      {/* Subtle gradient accent */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-china-red/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-china-red/5 blur-xl" />

      <div className="relative mb-2 flex items-center gap-2 text-sm font-medium text-china-red">
        <Sparkles className="h-4 w-4 animate-pulse" />
        Word of the Day
      </div>

      <div className="relative flex items-center gap-4 sm:gap-6">
        {/* Left: Chinese character + pinyin */}
        <div className="flex-shrink-0 text-center">
          <p className="font-chinese text-3xl font-medium text-text-primary">{word.chinese}</p>
          <p className="mt-0.5 text-sm text-text-pinyin">{word.pinyin}</p>
        </div>

        {/* Divider */}
        <div className="h-12 w-px flex-shrink-0 bg-white/10" />

        {/* Right: English, song, save */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary">{word.english}</p>
          <p className="mt-0.5 truncate text-xs text-text-secondary">
            From: <span className="text-text-primary">{word.songTitle}</span>
          </p>
          {user && !saved && (
            <button
              onClick={handleSave}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-china-red px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-china-red/20 transition-all hover:bg-china-red-dark active:scale-[0.98]"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              Save to Vocabulary
            </button>
          )}
          {saved && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400">
              <BookmarkPlus className="h-3.5 w-3.5" />
              Added!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
