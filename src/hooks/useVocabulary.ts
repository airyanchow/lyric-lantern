import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { LyricWord, SavedWord } from '../types';

interface UseVocabularyReturn {
  words: SavedWord[];
  loading: boolean;
  error: string | null;
  saveWord: (word: LyricWord, songTitle?: string) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  refreshWords: () => Promise<void>;
}

export function useVocabulary(): UseVocabularyReturn {
  const { user } = useAuth();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  return {
    words,
    loading,
    error,
    saveWord,
    deleteWord,
    refreshWords: fetchWords,
  };
}
