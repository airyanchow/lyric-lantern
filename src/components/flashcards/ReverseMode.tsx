import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Flame, RotateCcw, Trophy } from 'lucide-react';
import { useFlashcards } from '../../hooks/useFlashcards';

export default function ReverseMode() {
  const { cards, currentCard, nextCard, progress, resetDeck, loading, finished } = useFlashcards();
  const [selected, setSelected] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const options = useMemo(() => {
    if (!currentCard) return [];
    const correctLabel = `${currentCard.chinese} (${currentCard.pinyin})`;
    const distractors = cards
      .filter(c => c.id !== currentCard.id)
      .slice(0, 10)
      .sort(() => currentCard.id.charCodeAt(0) % 2 === 0 ? -1 : 1)
      .slice(0, 3)
      .map(c => `${c.chinese} (${c.pinyin})`);
    const all = [...new Set([correctLabel, ...distractors])];
    const seed = currentCard.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    for (let i = all.length - 1; i > 0; i--) {
      const j = (seed * (i + 1) * 7) % (i + 1);
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }, [currentCard?.id, cards]);

  const correctLabel = currentCard ? `${currentCard.chinese} (${currentCard.pinyin})` : '';

  const handleSelect = useCallback((option: string) => {
    if (selected) return;
    setSelected(option);
    const correct = option === correctLabel;
    if (correct) {
      setStreak(prev => {
        const next = prev + 1;
        setBestStreak(b => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
    timeoutRef.current = setTimeout(() => { nextCard(correct); setSelected(null); }, 800);
  }, [selected, correctLabel, nextCard]);

  useEffect(() => { setSelected(null); }, [currentCard?.id]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-text-pinyin border-t-transparent" /></div>;
  }

  if (progress.total < 4) {
    return <div className="py-12 text-center text-text-secondary">Need at least 4 saved words for Reverse mode.</div>;
  }

  if (finished) {
    return (
      <div className="mx-auto max-w-sm space-y-6 py-8 text-center">
        <Trophy className="mx-auto h-16 w-16 text-china-red" />
        <h2 className="text-2xl font-bold">Complete!</h2>
        <p className="text-text-secondary">Best streak: <span className="font-bold text-orange-400">{bestStreak}</span></p>
        <button onClick={() => { resetDeck(); setStreak(0); setBestStreak(0); }} className="inline-flex items-center gap-2 rounded-lg bg-china-red px-6 py-2.5 font-medium text-white hover:bg-china-red/80">
          <RotateCcw className="h-4 w-4" /> Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">{progress.done + 1} / {progress.total}</span>
        {streak > 0 && (
          <span className={`flex items-center gap-1 font-bold ${streak >= 5 ? 'text-orange-400' : 'text-china-red'}`}>
            <Flame className={`h-4 w-4 ${streak >= 5 ? 'animate-pulse' : ''}`} /> {streak} streak
          </span>
        )}
      </div>

      {currentCard && (
        <div className="rounded-2xl border border-white/10 bg-bg-card p-8 text-center">
          <p className="text-2xl font-medium text-text-primary">{currentCard.english}</p>
          <p className="mt-2 text-sm text-text-secondary">Which Chinese word matches?</p>
        </div>
      )}

      <div className="grid gap-3">
        {options.map((option, i) => {
          let cls = 'w-full rounded-xl border border-white/10 bg-bg-card px-4 py-3 text-left font-chinese text-base font-medium transition-all hover:border-china-red/30';
          if (selected) {
            if (option === correctLabel) cls += ' border-green-500 bg-green-500/10 text-green-300';
            else if (option === selected) cls += ' border-red-500 bg-red-500/10 text-red-300';
            else cls += ' opacity-50';
          } else {
            cls += ' text-text-primary';
          }
          return (
            <button key={`${currentCard?.id}-${i}`} onClick={() => handleSelect(option)} className={cls} disabled={!!selected}>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
