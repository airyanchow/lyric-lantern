import { useState } from 'react';
import { ArrowLeft, Layers, Timer, ListChecks, ArrowRightLeft, Grid3X3, Flame } from 'lucide-react';
import FlashcardDeck from '../components/flashcards/FlashcardDeck';
import SpeedRound from '../components/flashcards/SpeedRound';
import MultipleChoice from '../components/flashcards/MultipleChoice';
import ReverseMode from '../components/flashcards/ReverseMode';
import MatchGame from '../components/flashcards/MatchGame';
import StreakChallenge from '../components/flashcards/StreakChallenge';

const MODES = [
  { id: 'standard', name: 'Standard', desc: 'Classic flashcard review', icon: Layers, color: 'text-blue-400' },
  { id: 'speed', name: 'Speed Round', desc: '60 seconds, go fast!', icon: Timer, color: 'text-orange-400' },
  { id: 'choice', name: 'Multiple Choice', desc: 'Pick the right answer', icon: ListChecks, color: 'text-green-400' },
  { id: 'reverse', name: 'Reverse', desc: 'English → Chinese', icon: ArrowRightLeft, color: 'text-purple-400' },
  { id: 'match', name: 'Match Game', desc: 'Memory matching pairs', icon: Grid3X3, color: 'text-teal-400' },
  { id: 'streak', name: 'Streak Challenge', desc: 'How long can you go?', icon: Flame, color: 'text-red-400' },
] as const;

type Mode = typeof MODES[number]['id'];

const MODE_COMPONENTS: Record<Mode, React.ComponentType> = {
  standard: FlashcardDeck,
  speed: SpeedRound,
  choice: MultipleChoice,
  reverse: ReverseMode,
  match: MatchGame,
  streak: StreakChallenge,
};

export default function FlashcardsPage() {
  const [activeMode, setActiveMode] = useState<Mode | null>(null);

  if (activeMode) {
    const ModeComponent = MODE_COMPONENTS[activeMode];
    const modeName = MODES.find(m => m.id === activeMode)?.name;
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <button
          onClick={() => setActiveMode(null)}
          className="mb-6 flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to modes
        </button>
        <h1 className="mb-6 text-center text-2xl font-bold">{modeName}</h1>
        <ModeComponent />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <Layers className="mx-auto h-10 w-10 text-china-red" />
        <h1 className="mt-4 text-2xl font-bold">Flashcards</h1>
        <p className="mt-2 text-text-secondary">Practice your saved vocabulary with fun game modes</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map(mode => {
          const Icon = mode.icon;
          const isRecommended = mode.id === 'standard';
          return (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`group relative flex flex-col items-center rounded-2xl border p-6 text-center transition-all hover:bg-bg-card/80 ${
                isRecommended
                  ? 'border-china-red/40 bg-china-red/5 ring-1 ring-china-red/20 hover:border-china-red/60'
                  : 'border-white/10 bg-bg-card hover:border-china-red/30'
              }`}
            >
              {isRecommended && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-china-red px-2.5 py-0.5 text-[10px] font-bold text-white">
                  Recommended
                </span>
              )}
              <Icon className={`h-10 w-10 ${mode.color}`} />
              <h3 className="mt-3 font-semibold text-text-primary">{mode.name}</h3>
              <p className="mt-1 text-sm text-text-secondary">{mode.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
