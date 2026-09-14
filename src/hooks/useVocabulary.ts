import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { LyricWord, SavedWord } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface UseVocabularyReturn {
  words: SavedWord[];
  loading: boolean;
  error: string | null;
  saveWord: (word: LyricWord, songTitle?: string) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  refreshWords: () => Promise<void>;
  updateWordLocally: (updated: SavedWord) => void;
}

export function useVocabulary(): UseVocabularyReturn {
  const { user } = useAuth();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const posGenerating = useRef(false);

  const fetchWords = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('saved_vocabulary')
      .select('*')
      .order('created_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setWords(data || []);
    }
    setLoading(false);
  }, [user]);

  // Auto-generate POS for words that don't have it yet
  const generateMissingPos = useCallback(async (currentWords: SavedWord[]) => {
    if (posGenerating.current) return;

    const needsPos = currentWords.filter(w => !w.part_of_speech);
    if (needsPos.length === 0) return;

    posGenerating.current = true;

    // Process in batches of 30
    for (let i = 0; i < needsPos.length; i += 30) {
      const batch = needsPos.slice(i, i + 30);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/generate-word-details`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            mode: 'batch-pos',
            words: batch.map(w => ({
              id: w.id,
              chinese: w.chinese,
              pinyin: w.pinyin,
              english: w.english,
            })),
          }),
        });

        if (!res.ok) continue;

        const data = await res.json();
        if (data.results) {
          const results: Record<string, string> = data.results;
          setWords(prev =>
            prev.map(w =>
              results[w.id] ? { ...w, part_of_speech: results[w.id] } : w
            )
          );
        }
      } catch (err) {
        console.error('Batch POS generation error:', err);
      }
    }

    posGenerating.current = false;
  }, []);

  const saveWord = useCallback(
    async (word: LyricWord, songTitle?: string) => {
      if (!user) {
        setError('You must be logged in to save words');
        return;
      }

      const { error: err } = await supabase.from('saved_vocabulary').insert({
        user_id: user.id,
        chinese: word.chinese,
        pinyin: word.pinyin,
        english: word.english,
        song_title: songTitle || null,
      });

      if (err) {
        setError(err.message);
      } else {
        await fetchWords();
      }
    },
    [user, fetchWords]
  );

  const deleteWord = useCallback(
    async (id: string) => {
      const { error: err } = await supabase
        .from('saved_vocabulary')
        .delete()
        .eq('id', id);

      if (err) {
        setError(err.message);
      } else {
        setWords((prev) => prev.filter((w) => w.id !== id));
      }
    },
    []
  );

  const updateWordLocally = useCallback((updated: SavedWord) => {
    setWords((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  }, []);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  // After words load, auto-generate POS for any that are missing
  useEffect(() => {
    if (words.length > 0 && !loading) {
      generateMissingPos(words);
    }
  }, [words.length, loading]); // only re-run when count changes or loading finishes

  return {
    words,
    loading,
    error,
    saveWord,
    deleteWord,
    refreshWords: fetchWords,
    updateWordLocally,
  };
}
