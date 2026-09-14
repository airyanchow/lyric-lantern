import { useState, useEffect } from 'react';
import { BarChart3, BookOpen, Music, Flame, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useVocabulary } from '../hooks/useVocabulary';
import { useFavorites } from '../hooks/useFavorites';
import { supabase } from '../lib/supabase';

interface FlashcardStats {
  totalCorrect: number;
  totalIncorrect: number;
  accuracy: number;
  wordsPracticed: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { words } = useVocabulary();
  const { favorites } = useFavorites();
  const [stats, setStats] = useState<FlashcardStats>({ totalCorrect: 0, totalIncorrect: 0, accuracy: 0, wordsPracticed: 0 });
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Fetch flashcard stats
    supabase
      .from('flashcard_stats')
      .select('correct_count, incorrect_count')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) {
          const totalCorrect = data.reduce((sum, r) => sum + r.correct_count, 0);
          const totalIncorrect = data.reduce((sum, r) => sum + r.incorrect_count, 0);
          const total = totalCorrect + totalIncorrect;
          setStats({
            totalCorrect,
            totalIncorrect,
            accuracy: total > 0 ? Math.round((totalCorrect / total) * 100) : 0,
            wordsPracticed: data.length,
          });
        }
      });

    // Fetch streak
    supabase
      .from('profiles')
      .select('streak_days')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setStreak(data.streak_days || 0);
      });
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-text-secondary">
        Sign in to see your dashboard
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-china-red" />
          <h1 className="text-2xl font-bold">My Dashboard</h1>
        </div>
      </div>

      {/* Stats Grid — primary stat spans 2 cols on sm */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-bg-card p-5 sm:col-span-2 lg:col-span-1">
          <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="relative">
            <div className="inline-flex rounded-xl bg-blue-500/10 p-2.5">
              <BookOpen className="h-6 w-6 text-blue-400" />
            </div>
            <p className="mt-3 text-3xl font-bold">{words.length}</p>
            <p className="text-sm text-text-secondary">Words Saved</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-green-500/20 bg-bg-card p-5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-green-500/10 blur-2xl" />
          <div className="relative">
            <div className="inline-flex rounded-xl bg-green-500/10 p-2.5">
              <Music className="h-6 w-6 text-green-400" />
            </div>
            <p className="mt-3 text-3xl font-bold">{favorites.length}</p>
            <p className="text-sm text-text-secondary">Songs Favorited</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-orange-500/20 bg-bg-card p-5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-orange-500/10 blur-2xl" />
          <div className="relative">
            <div className="inline-flex rounded-xl bg-orange-500/10 p-2.5">
              <Flame className="h-6 w-6 text-orange-400" />
            </div>
            <p className="mt-3 text-3xl font-bold">{streak}</p>
            <p className="text-sm text-text-secondary">Day Streak</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-china-red/20 bg-bg-card p-5">
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-china-red/10 blur-2xl" />
          <div className="relative">
            <div className="inline-flex rounded-xl bg-china-red/10 p-2.5">
              <Target className="h-6 w-6 text-china-red" />
            </div>
            <p className="mt-3 text-3xl font-bold">{stats.accuracy}%</p>
            <p className="text-sm text-text-secondary">Flashcard Accuracy</p>
          </div>
        </div>
      </div>

      {/* Flashcard Details */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <TrendingUp className="h-5 w-5 text-china-red" />
          Flashcard Progress
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-bold text-green-400">{stats.totalCorrect}</p>
            <p className="text-sm text-text-secondary">Correct Answers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{stats.totalIncorrect}</p>
            <p className="text-sm text-text-secondary">Incorrect Answers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{stats.wordsPracticed}</p>
            <p className="text-sm text-text-secondary">Words Practiced</p>
          </div>
        </div>
        {stats.wordsPracticed === 0 && (
          <p className="mt-4 text-sm text-text-secondary">
            Start practicing flashcards to see your progress here!
          </p>
        )}
      </div>
    </div>
  );
}
