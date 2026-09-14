import { useState, useEffect, useCallback, useRef } from 'react';
import { Check, X, Timer, Trophy, RotateCcw } from 'lucide-react';
import FlashCard from './FlashCard';
import { useFlashcards } from '../../hooks/useFlashcards';

const ROUND_SECONDS = 60;

export default function SpeedRound() {
  const { currentCard, nextCard, progress, resetDeck, loading, finished } = useFlashcards(undefined);
  const [flipped, setFlipped] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!started || gameOver) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started, gameOver]);

  const handleAnswer = useCallback((correct: boolean) => {
    if (gameOver) return;
    if (correct) setScore(s => s + 1);
    nextCard(correct);
    setFlipped(false);
  }, [nextCard, gameOver]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-text-pinyin border-t-transparent" /></div>;
  }

  if (progress.total === 0) {
    return <div className="py-12 text-center text-text-secondary">No vocabulary words saved yet.</div>;
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-sm space-y-6 py-12 text-center">
        <Timer className="mx-auto h-16 w-16 text-china-red" />
        <h2 className="text-2xl font-bold">Speed Round</h2>
        <p className="text-text-secondary">Answer as many flashcards as you can in 60 seconds!</p>
        <button
          onClick={() => setStarted(true)}
          className="rounded-xl bg-china-red px-8 py-3 text-lg font-bold text-white hover:bg-china-red-dark"
        >
          Start!
        </button>
      </div>
    );
  }

  if (gameOver || finished) {
    return (
      <div className="mx-auto max-w-sm space-y-6 py-8 text-center">
        <Trophy className="mx-auto h-16 w-16 text-china-red" />
        <h2 className="text-2xl font-bold">Time's Up!</h2>
        <p className="text-6xl font-bold text-china-red">{score}</p>
        <p className="text-text-secondary">cards answered correctly</p>
        <button
          onClick={() => { resetDeck(); setScore(0); setTimeLeft(ROUND_SECONDS); setGameOver(false); setStarted(false); }}
          className="inline-flex items-center gap-2 rounded-lg bg-china-red px-6 py-2.5 font-medium text-white hover:bg-china-red-dark"
        >
          <RotateCcw className="h-4 w-4" /> Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      {/* Timer + Score */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 text-lg font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-text-primary'}`}>
          <Timer className="h-5 w-5" /> {timeLeft}s
        </div>
        <div className="text-lg font-bold text-china-red">Score: {score}</div>
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
          <Check className="h-5 w-5" /> Know
        </button>
      </div>
    </div>
  );
}
