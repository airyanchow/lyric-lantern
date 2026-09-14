import { useState, useCallback } from 'react';
import { Flame, Check, X, RotateCcw, Trophy, Sparkles, Dumbbell } from 'lucide-react';
import FlashCard from './FlashCard';
import { useFlashcards } from '../../hooks/useFlashcards';

export default function StreakChallenge() {
  const { currentCard, nextCard, resetDeck, loading, cards } = useFlashcards();
  const [flipped, setFlipped] = useState(false);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(() => {
    const stored = localStorage.getItem('lyric-lantern-streak-best');
    return stored ? parseInt(stored, 10) : 0;
  });
  const [gameOver, setGameOver] = useState(false);
  const [finalStreak, setFinalStreak] = useState(0);

  const handleAnswer = useCallback((correct: boolean) => {
    if (correct) {
      setStreak(prev => {
        const next = prev + 1;
        setBest(b => {
          if (next > b) {
            try { localStorage.setItem('lyric-lantern-streak-best', String(next)); } catch {}
            return next;
          }
          return b;
        });
        return next;
      });
      nextCard(true);
      setFlipped(false);
    } else {
      // Use functional update to capture current streak value
      setStreak(prev => {
        setFinalStreak(prev);
        return prev;
      });
      setGameOver(true);
      nextCard(false);
    }
  }, [nextCard]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-text-pinyin border-t-transparent" /></div>;
  }

  if (cards.length === 0) {
    return <div className="py-12 text-center text-text-secondary">No vocabulary words saved yet.</div>;
  }

  if (gameOver) {
    return (
      <div className="mx-auto max-w-sm space-y-6 py-8 text-center">
        <div className="flex justify-center">
          {finalStreak >= 10 ? (
            <div className="rounded-full bg-orange-500/10 p-4">
              <Trophy className="h-14 w-14 text-orange-400" />
            </div>
          ) : finalStreak >= 5 ? (
            <div className="rounded-full bg-amber-500/10 p-4">
              <Sparkles className="h-14 w-14 text-amber-400" />
            </div>
          ) : (
            <div className="rounded-full bg-blue-500/10 p-4">
              <Dumbbell className="h-14 w-14 text-blue-400" />
            </div>
          )}
        </div>
        <h2 className="text-2xl font-bold">Streak Broken!</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-bg-card p-4">
            <p className="text-3xl font-bold text-china-red">{finalStreak}</p>
            <p className="text-xs text-text-secondary">This Run</p>
          </div>
          <div className="rounded-xl bg-bg-card p-4">
            <p className="text-3xl font-bold text-orange-400">{best}</p>
            <p className="text-xs text-text-secondary">Personal Best</p>
          </div>
        </div>
        <button
          onClick={() => { resetDeck(); setStreak(0); setGameOver(false); setFlipped(false); }}
          className="inline-flex items-center gap-2 rounded-lg bg-china-red px-6 py-2.5 font-medium text-white hover:bg-china-red-dark"
        >
          <RotateCcw className="h-4 w-4" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      {/* Streak Counter */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-2xl font-bold ${streak >= 5 ? 'text-orange-400' : 'text-china-red'}`}>
          <Flame className={`h-6 w-6 ${streak >= 5 ? 'animate-pulse' : ''}`} />
          {streak}
        </div>
        <div className="text-sm text-text-secondary">Best: {best}</div>
      </div>

      {currentCard && (
        <FlashCard
          chinese={currentCard.chinese}
          pinyin={currentCard.pinyin}
          english={currentCard.english}
          flipped={flipped}
          onFlip={() => setFlipped(!flipped)}
        />
      )}

      <div className="flex justify-center gap-4">
        <button onClick={() => handleAnswer(false)} className="flex items-center gap-2 rounded-xl bg-red-500/10 px-6 py-3 font-medium text-red-400 hover:bg-red-500/20">
          <X className="h-5 w-5" /> Don't Know
        </button>
        <button onClick={() => handleAnswer(true)} className="flex items-center gap-2 rounded-xl bg-green-500/10 px-6 py-3 font-medium text-green-400 hover:bg-green-500/20">
          <Check className="h-5 w-5" /> Know It
        </button>
      </div>
    </div>
  );
}
