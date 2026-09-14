import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface FlashcardWord {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
}

export interface FlashcardResult {
  word: FlashcardWord;
  correct: boolean;
}

interface UseFlashcardsReturn {
  cards: FlashcardWord[];
  currentCard: FlashcardWord | null;
  nextCard: (correct: boolean) => void;
  progress: { done: number; total: number };
  results: FlashcardResult[];
  resetDeck: () => void;
  loading: boolean;
  finished: boolean;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function useFlashcards(wordIds?: string[]): UseFlashcardsReturn {
  const { user } = useAuth();
  const [allWords, setAllWords] = useState<FlashcardWord[]>([]);
  const [cards, setCards] = useState<FlashcardWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<FlashcardResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const statsQueue = useRef<{ wordId: string; correct: boolean }[]>([]);
  const flushingRef = useRef(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchWords = async () => {
      setLoading(true);
      let query = supabase
        .from('saved_vocabulary')
        .select('id, chinese, pinyin, english');

      if (wordIds && wordIds.length > 0) {
        query = query.in('id', wordIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch flashcard words:', error.message);
        setLoading(false);
        return;
      }

      const words: FlashcardWord[] = (data || []).map((w: any) => ({
        id: w.id,
        chinese: w.chinese,
        pinyin: w.pinyin,
        english: w.english,
      }));

      setAllWords(words);
      setCards(shuffle(words));
      setCurrentIndex(0);
      setResults([]);
      setFinished(false);
      setLoading(false);
    };

    fetchWords();
  }, [user, wordIds]);

  // Flush stats to Supabase — guarded against concurrent flushes
  const flushStats = useCallback(async () => {
    if (!user || statsQueue.current.length === 0 || flushingRef.current) return;
    flushingRef.current = true;

    const batch = [...statsQueue.current];
    statsQueue.current = [];

    try {
      for (const { wordId, correct } of batch) {
        const { data: existing } = await supabase
          .from('flashcard_stats')
          .select('id, correct_count, incorrect_count, ease_factor')
          .eq('user_id', user.id)
          .eq('word_id', wordId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('flashcard_stats')
            .update({
              correct_count: existing.correct_count + (correct ? 1 : 0),
              incorrect_count: existing.incorrect_count + (correct ? 0 : 1),
              ease_factor: correct
                ? Math.min(existing.ease_factor + 0.1, 3.0)
                : Math.max(existing.ease_factor - 0.2, 1.3),
              last_practiced: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          await supabase.from('flashcard_stats').insert({
            user_id: user.id,
            word_id: wordId,
            correct_count: correct ? 1 : 0,
            incorrect_count: correct ? 0 : 1,
            ease_factor: correct ? 2.6 : 2.3,
            last_practiced: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      // Re-queue failed batch items so they aren't lost
      statsQueue.current.unshift(...batch);
    } finally {
      flushingRef.current = false;
    }
  }, [user]);

  const nextCard = useCallback(
    (correct: boolean) => {
      if (finished || cards.length === 0) return;

      const card = cards[currentIndex];
      if (!card) return;

      statsQueue.current.push({ wordId: card.id, correct });
      setResults((prev) => [...prev, { word: card, correct }]);

      if (currentIndex + 1 >= cards.length) {
        setFinished(true);
        flushStats();
      } else {
        setCurrentIndex((prev) => prev + 1);
        // Flush stats every 5 cards
        if ((currentIndex + 1) % 5 === 0) {
          flushStats();
        }
      }
    },
    [cards, currentIndex, finished, flushStats]
  );

  const resetDeck = useCallback(() => {
    flushStats();
    setCards(shuffle(allWords));
    setCurrentIndex(0);
    setResults([]);
    setFinished(false);
  }, [allWords, flushStats]);

  const currentCard = cards.length > 0 && !finished ? cards[currentIndex] : null;

  return {
    cards,
    currentCard,
    nextCard,
    progress: { done: results.length, total: cards.length },
    results,
    resetDeck,
    loading,
    finished,
  };
}
