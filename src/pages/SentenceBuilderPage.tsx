import { useState, useEffect, useMemo, useCallback } from 'react';
import { RotateCcw, Check, Flame, Shuffle, Lightbulb, SkipForward } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SentenceWord {
  chinese: string;
  pinyin: string;
}

interface SentenceLine {
  words: SentenceWord[];
  english: string;
  songTitle: string;
}

export default function SentenceBuilderPage() {
  const [lines, setLines] = useState<SentenceLine[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hintUsed, setHintUsed] = useState(false);

  useEffect(() => {
    supabase
      .from('songs')
      .select('title, lyrics')
      .eq('is_published', true)
      .not('lyrics', 'is', null)
      .limit(20)
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        const collected: SentenceLine[] = [];
        for (const song of data) {
          const lyrics = song.lyrics as any[];
          if (!lyrics) continue;
          for (const line of lyrics) {
            if (line.words && line.words.length >= 3 && line.words.length <= 10) {
              collected.push({
                words: line.words.map((w: any) => ({ chinese: w.chinese, pinyin: w.pinyin })),
                english: line.english,
                songTitle: song.title,
              });
            }
          }
        }
        // Shuffle and take up to 20
        setLines(collected.sort(() => Math.random() - 0.5).slice(0, 20));
        setLoading(false);
      });
  }, []);

  const current = lines[currentIndex] || null;

  const shuffledWords = useMemo(() => {
    if (!current) return [];
    return current.words
      .map((w, i) => ({ ...w, originalIndex: i }))
      .sort(() => Math.random() - 0.5);
  }, [current]);

  const availableWords = useMemo(() => {
    return shuffledWords.filter((_, i) => !selected.includes(i));
  }, [shuffledWords, selected]);

  const selectedWords = useMemo(() => {
    return selected.map(i => shuffledWords[i]);
  }, [selected, shuffledWords]);

  const handleSelectWord = useCallback((shuffleIndex: number) => {
    if (result) return;
    setSelected(prev => [...prev, shuffleIndex]);
  }, [result]);

  const handleRemoveWord = useCallback((position: number) => {
    if (result) return;
    setSelected(prev => prev.filter((_, i) => i !== position));
  }, [result]);

  const handleCheck = useCallback(() => {
    if (!current) return;
    const isCorrect = selectedWords.every((w, i) => w.originalIndex === i);
    setResult(isCorrect ? 'correct' : 'wrong');
    if (isCorrect && !hintUsed) {
      setScore(s => s + 1);
      setStreak(s => s + 1);
    } else if (!isCorrect) {
      setStreak(0);
    }
  }, [current, selectedWords, hintUsed]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 < lines.length) {
      setCurrentIndex(i => i + 1);
    } else {
      setCurrentIndex(0);
    }
    setSelected([]);
    setResult(null);
    setHintUsed(false);
  }, [currentIndex, lines.length]);

  const handleReset = useCallback(() => {
    setSelected([]);
    setResult(null);
    setHintUsed(false);
  }, []);

  const handleHint = useCallback(() => {
    if (!current || result) return;
    // Find the next correct word to place
    const nextPosition = selected.length;
    if (nextPosition >= current.words.length) return;
    // Find the shuffled index of the word at the correct original position
    const shuffleIdx = shuffledWords.findIndex(
      w => w.originalIndex === nextPosition && !selected.includes(shuffledWords.indexOf(w))
    );
    if (shuffleIdx !== -1) {
      setSelected(prev => [...prev, shuffleIdx]);
      setHintUsed(true);
    }
  }, [current, result, selected, shuffledWords]);

  const handleSkip = useCallback(() => {
    setStreak(0);
    handleNext();
  }, [handleNext]);

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-text-pinyin border-t-transparent" /></div>;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <Shuffle className="mx-auto h-12 w-12 text-text-secondary" />
        <h2 className="mt-4 text-xl font-bold">No sentences available</h2>
        <p className="mt-2 text-text-secondary">Study some songs first so we have lyrics to practice with!</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Shuffle className="h-5 w-5 text-china-red" /> Sentence Builder
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-text-secondary">Score: <strong className="text-text-primary">{score}</strong></span>
          {streak >= 2 && (
            <span className="flex items-center gap-1 font-bold text-orange-400">
              <Flame className={`h-4 w-4 ${streak >= 5 ? 'animate-pulse' : ''}`} /> {streak}
            </span>
          )}
        </div>
      </div>

      {current && (
        <div className="space-y-6">
          {/* English prompt */}
          <div className="rounded-xl border border-white/10 bg-bg-card p-4 text-center">
            <p className="text-sm text-text-secondary">Arrange the words to say:</p>
            <p className="mt-2 text-lg font-medium text-text-primary">{current.english}</p>
            <p className="mt-1 text-xs text-text-secondary">From: {current.songTitle}</p>
          </div>

          {/* Selected words (sentence building area) */}
          <div className={`min-h-[56px] rounded-xl border-2 border-dashed p-3 transition-all duration-300 ${
            result === 'correct' ? 'border-green-500 bg-green-500/10' :
            result === 'wrong' ? 'border-red-500 bg-red-500/10' :
            selectedWords.length === 0 ? 'drop-zone-waiting bg-bg-secondary/50' :
            'border-white/20 bg-bg-secondary/50'
          }`}>
            <div className="flex flex-wrap gap-2">
              {selectedWords.map((w, i) => (
                <button
                  key={i}
                  onClick={() => handleRemoveWord(i)}
                  className="rounded-lg bg-china-red/20 px-3 py-1.5 font-chinese text-base text-china-red-light transition-colors hover:bg-china-red/30"
                >
                  {w.chinese}
                </button>
              ))}
              {selectedWords.length === 0 && (
                <span className="text-sm text-text-secondary">Tap words below to build the sentence</span>
              )}
            </div>
          </div>

          {/* Available words */}
          <div className="flex flex-wrap justify-center gap-2">
            {availableWords.map((w) => {
              const shuffleIdx = shuffledWords.indexOf(w);
              return (
                <button
                  key={shuffleIdx}
                  onClick={() => handleSelectWord(shuffleIdx)}
                  className="rounded-lg border border-white/10 bg-bg-card px-3 py-2 font-chinese text-base text-text-primary transition-colors hover:border-china-red/30"
                >
                  <span>{w.chinese}</span>
                  <span className="ml-1.5 text-xs text-text-pinyin">{w.pinyin}</span>
                </button>
              );
            })}
          </div>

          {/* Result message */}
          {result === 'correct' && (
            <p className="text-center font-bold text-green-400">Correct!</p>
          )}
          {result === 'wrong' && (
            <div className="text-center">
              <p className="font-bold text-red-400">Not quite!</p>
              <p className="mt-1 text-sm text-text-secondary">
                Correct order: {current.words.map(w => w.chinese).join(' ')}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap justify-center gap-2">
            {!result ? (
              <>
                <button onClick={handleReset} className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-text-secondary hover:bg-white/5">
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
                <button
                  onClick={handleHint}
                  disabled={selectedWords.length >= (current?.words.length || 0)}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-2 text-sm text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
                >
                  <Lightbulb className="h-4 w-4" /> Hint
                </button>
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-text-secondary hover:bg-white/5"
                >
                  <SkipForward className="h-4 w-4" /> Skip
                </button>
                <button
                  onClick={handleCheck}
                  disabled={selectedWords.length !== current.words.length}
                  className="flex items-center gap-1.5 rounded-lg bg-china-red px-6 py-2 text-sm font-medium text-white hover:bg-china-red-dark disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> Check
                </button>
              </>
            ) : (
              <button onClick={handleNext} className="rounded-lg bg-china-red px-6 py-2 text-sm font-medium text-white hover:bg-china-red-dark">
                Next Sentence
              </button>
            )}
          </div>
          {hintUsed && !result && (
            <p className="text-center text-xs text-amber-400/70">Hint used — no points for this sentence</p>
          )}
        </div>
      )}
    </div>
  );
}
