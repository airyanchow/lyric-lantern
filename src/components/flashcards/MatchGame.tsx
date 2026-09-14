import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Trophy, RotateCcw, Timer, MousePointerClick } from 'lucide-react';
import { useFlashcards } from '../../hooks/useFlashcards';

interface Card {
  id: string;
  label: string;
  matchId: string;
  type: 'chinese' | 'english';
}

export default function MatchGame() {
  const { cards: vocabCards, loading } = useFlashcards();
  const [gameCards, setGameCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [moves, setMoves] = useState(0);
  const flipTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [started, setStarted] = useState(false);

  // Pick 8 words and create pairs
  const pairs = useMemo(() => {
    return vocabCards.sort(() => Math.random() - 0.5).slice(0, 8);
  }, [vocabCards]);

  const initGame = useCallback(() => {
    const cards: Card[] = [];
    for (const word of pairs) {
      cards.push({ id: `zh-${word.id}`, label: word.chinese, matchId: word.id, type: 'chinese' });
      cards.push({ id: `en-${word.id}`, label: word.english, matchId: word.id, type: 'english' });
    }
    setGameCards(cards.sort(() => Math.random() - 0.5));
    setFlippedIds(new Set());
    setMatchedIds(new Set());
    setSelected(null);
    setMoves(0);
    setStartTime(Date.now());
    setElapsed(0);
    setGameWon(false);
    setStarted(true);
  }, [pairs]);

  // Timer + cleanup
  useEffect(() => {
    if (!started || gameWon) return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => { clearInterval(interval); if (flipTimeoutRef.current) clearTimeout(flipTimeoutRef.current); };
  }, [started, startTime, gameWon]);

  const handleCardClick = useCallback((cardId: string) => {
    if (matchedIds.has(cardId) || flippedIds.has(cardId)) return;

    if (!selected) {
      setSelected(cardId);
      setFlippedIds(prev => new Set(prev).add(cardId));
    } else {
      setFlippedIds(prev => new Set(prev).add(cardId));
      setMoves(m => m + 1);

      const first = gameCards.find(c => c.id === selected);
      const second = gameCards.find(c => c.id === cardId);

      if (first && second && first.matchId === second.matchId && first.id !== second.id) {
        // Match!
        setMatchedIds(prev => {
          const next = new Set(prev);
          next.add(first.id);
          next.add(second.id);
          if (next.size === gameCards.length) setGameWon(true);
          return next;
        });
        setSelected(null);
      } else {
        // No match - flip back after delay
        const sel = selected;
        flipTimeoutRef.current = setTimeout(() => {
          setFlippedIds(prev => {
            const next = new Set(prev);
            next.delete(sel);
            next.delete(cardId);
            return next;
          });
          setSelected(null);
        }, 800);
      }
    }
  }, [selected, matchedIds, flippedIds, gameCards]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-text-pinyin border-t-transparent" /></div>;
  }

  if (pairs.length < 4) {
    return <div className="py-12 text-center text-text-secondary">Need at least 4 saved words for Match Game.</div>;
  }

  if (!started) {
    return (
      <div className="mx-auto max-w-sm space-y-6 py-12 text-center">
        <MousePointerClick className="mx-auto h-16 w-16 text-china-red" />
        <h2 className="text-2xl font-bold">Match Game</h2>
        <p className="text-text-secondary">Match Chinese words with their English translations!</p>
        <button onClick={initGame} className="rounded-xl bg-china-red px-8 py-3 text-lg font-bold text-white hover:bg-china-red-dark">
          Start!
        </button>
      </div>
    );
  }

  if (gameWon) {
    return (
      <div className="mx-auto max-w-sm space-y-6 py-8 text-center">
        <Trophy className="mx-auto h-16 w-16 text-china-red" />
        <h2 className="text-2xl font-bold">All Matched!</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-bg-card p-3">
            <p className="text-2xl font-bold text-china-red">{elapsed}s</p>
            <p className="text-xs text-text-secondary">Time</p>
          </div>
          <div className="rounded-xl bg-bg-card p-3">
            <p className="text-2xl font-bold text-china-red">{moves}</p>
            <p className="text-xs text-text-secondary">Moves</p>
          </div>
        </div>
        <button onClick={initGame} className="inline-flex items-center gap-2 rounded-lg bg-china-red px-6 py-2.5 font-medium text-white hover:bg-china-red-dark">
          <RotateCcw className="h-4 w-4" /> Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1 text-text-secondary"><Timer className="h-4 w-4" /> {elapsed}s</span>
        <span className="text-text-secondary">Moves: {moves}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {gameCards.map(card => {
          const isFlipped = flippedIds.has(card.id);
          const isMatched = matchedIds.has(card.id);
          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              className={`flex min-h-[3.5rem] items-center justify-center rounded-xl border p-2 text-center text-sm font-medium transition-all sm:min-h-[5rem] ${
                isMatched
                  ? 'border-green-500/50 bg-green-500/10 text-green-300'
                  : isFlipped
                    ? 'border-china-red/50 bg-bg-card text-text-primary'
                    : 'cursor-pointer border-white/10 bg-bg-secondary text-transparent hover:border-white/20'
              } ${card.type === 'chinese' && (isFlipped || isMatched) ? 'font-chinese text-base' : ''}`}
              disabled={isMatched}
            >
              {isFlipped || isMatched ? card.label : '?'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
