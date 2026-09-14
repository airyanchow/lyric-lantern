import { useState, useCallback } from 'react';
import { Check, X, RotateCcw, Trophy } from 'lucide-react';
import FlashCard from './FlashCard';
import { useFlashcards } from '../../hooks/useFlashcards';

export default function FlashcardDeck() {
  const { currentCard, nextCard, progress, results, resetDeck, loading, finished } = useFlashcards();
  const [flipped, setFlipped] = useState(false);

  const handleAnswer = useCallback((correct: boolean) => {
    nextCard(correct);
    setFlipped(false);
  }, [nextCard]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-pinyin border-t-transparent" />
      </div>
    );
  }

  if (progress.total === 0) {
    return (
      <div className="py-12 text-center text-text-secondary">
        No vocabulary words saved yet. Save some words from song lyrics first!
      </div>
    );
  }

  if (finished) {
    const correct = results.filter(r => r.correct).length;
    const pct = Math.round((correct / results.length) * 100);
    return (
      <div className="mx-auto max-w-sm space-y-6 py-8 text-center">
        <Trophy className="mx-auto h-16 w-16 text-china-red" />
        <h2 className="text-2xl font-bold">Session Complete!</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-green-500/10 p-3">
            <p className="text-2xl font-bold text-green-400">{correct}</p>
            <p className="text-xs text-text-secondary">Correct</p>
          </div>
          <div className="rounded-xl bg-red-500/10 p-3">
            <p className="text-2xl font-bold text-red-400">{results.length - correct}</p>
            <p className="text-xs text-text-secondary">Missed</p>
          </div>
          <div className="rounded-xl bg-china-red/10 p-3">
            <p className="text-2xl font-bold text-china-red-light">{pct}%</p>
            <p className="text-xs text-text-secondary">Accuracy</p>
          </div>
        </div>
        <button
          onClick={resetDeck}
          className="inline-flex items-center gap-2 rounded-lg bg-china-red px-6 py-2.5 font-medium text-white hover:bg-china-red-dark"
        >
          <RotateCcw className="h-4 w-4" />
          Practice Again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-text-secondary">
          <span>{progress.done + 1} of {progress.total}</span>
          <span>{Math.round(((progress.done) / progress.total) * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-china-red transition-all"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      {currentCard && (
        <FlashCard
          chinese={currentCard.chinese}
          pinyin={currentCard.pinyin}
          english={currentCard.english}
          flipped={flipped}
          onFlip={() => setFlipped(!flipped)}
        />
      )}

      {/* Buttons */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => handleAnswer(false)}
          className="flex items-center gap-2 rounded-xl bg-red-500/10 px-6 py-3 font-medium text-red-400 transition-colors hover:bg-red-500/20"
        >
          <X className="h-5 w-5" />
          Still Learning
        </button>
        <button
          onClick={() => handleAnswer(true)}
          className="flex items-center gap-2 rounded-xl bg-green-500/10 px-6 py-3 font-medium text-green-400 transition-colors hover:bg-green-500/20"
        >
          <Check className="h-5 w-5" />
          Know It
        </button>
      </div>
    </div>
  );
}
