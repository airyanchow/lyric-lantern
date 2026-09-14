import { useState } from 'react';
import { Trash2, Music, ChevronDown, Sparkles, BookOpen, Loader2 } from 'lucide-react';
import type { SavedWord } from '../../types';

interface VocabularyCardProps {
  word: SavedWord;
  onDelete: (id: string) => void;
  onWordUpdated: (updated: SavedWord) => void;
}

export const POS_COLORS: Record<string, string> = {
  noun: 'bg-sky-500/20 text-sky-300',
  verb: 'bg-emerald-500/20 text-emerald-300',
  adjective: 'bg-amber-500/20 text-amber-300',
  adverb: 'bg-purple-500/20 text-purple-300',
  pronoun: 'bg-indigo-500/20 text-indigo-300',
  preposition: 'bg-teal-500/20 text-teal-300',
  conjunction: 'bg-pink-500/20 text-pink-300',
  particle: 'bg-rose-500/20 text-rose-300',
  'measure word': 'bg-orange-500/20 text-orange-300',
  interjection: 'bg-yellow-500/20 text-yellow-300',
  'auxiliary verb': 'bg-lime-500/20 text-lime-300',
  phrase: 'bg-cyan-500/20 text-cyan-300',
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export default function VocabularyCard({ word, onDelete, onWordUpdated }: VocabularyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const hasExample = !!word.example_chinese;

  const handleExpand = async () => {
    const willExpand = !expanded;
    setExpanded(willExpand);

    // If expanding and no example sentence yet, auto-generate full details
    if (willExpand && !hasExample && !generating) {
      await generateDetails();
    }
  };

  const generateDetails = async (regenerate = false) => {
    setGenerating(true);
    setGenError(null);

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/generate-word-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          wordId: word.id,
          chinese: word.chinese,
          pinyin: word.pinyin,
          english: word.english,
          regenerate,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Generate error:', res.status, errText);
        setGenError(`Failed to generate details (${res.status})`);
        return;
      }

      const data = await res.json();

      if (data.error) {
        setGenError(data.error);
        console.error('Generate error:', data.error);
        return;
      }

      // Update the word in parent state
      onWordUpdated({
        ...word,
        part_of_speech: data.part_of_speech,
        example_chinese: data.example_chinese,
        example_pinyin: data.example_pinyin,
        example_english: data.example_english,
      });
    } catch (err) {
      setGenError('Failed to generate details — network error');
      console.error('Generate error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const posColor = word.part_of_speech
    ? POS_COLORS[word.part_of_speech.toLowerCase()] || 'bg-white/10 text-text-secondary'
    : '';

  return (
    <div
      className={`group relative rounded-xl border transition-all duration-200 ${
        expanded
          ? 'border-china-red/30 bg-bg-card shadow-lg shadow-china-red/5 col-span-1 sm:col-span-2'
          : 'border-white/5 bg-bg-card hover:border-white/10 cursor-pointer'
      }`}
      onClick={!expanded ? handleExpand : undefined}
    >
      {/* Collapsed view */}
      <div className={`p-4 ${expanded ? 'cursor-pointer' : ''}`} onClick={expanded ? handleExpand : undefined}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-chinese text-2xl font-medium text-text-primary">{word.chinese}</p>
              {word.part_of_speech && !expanded && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${posColor}`}>
                  {word.part_of_speech}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-text-pinyin">{word.pinyin}</p>
            <p className="mt-1 text-sm text-text-secondary">{word.english}</p>
          </div>

          <div className="flex items-center gap-1">
            {/* Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(word.id); }}
              className="rounded-md p-1 text-text-secondary opacity-0 transition-all hover:bg-china-red/10 hover:text-china-red group-hover:opacity-100"
              title="Delete word"
              aria-label="Delete word"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {/* Expand indicator */}
            <ChevronDown
              className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {/* Song source */}
        {word.song_title && (
          <div className="mt-2 flex items-center gap-1 text-xs text-text-secondary/60">
            <Music className="h-3 w-3" />
            <span>{word.song_title}</span>
          </div>
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3">
          {generating ? (
            <div className="flex items-center gap-2 py-4 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin text-china-red" />
              <span>Generating example sentence...</span>
            </div>
          ) : genError ? (
            <div className="space-y-2 py-2">
              <p className="text-sm text-red-400">{genError}</p>
              <button
                onClick={(e) => { e.stopPropagation(); generateDetails(); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-china-red/10 px-3 py-1.5 text-xs font-medium text-china-red-light hover:bg-china-red/20"
              >
                <Sparkles className="h-3 w-3" /> Retry
              </button>
            </div>
          ) : hasExample ? (
            <div className="space-y-3">
              {/* Part of speech */}
              {word.part_of_speech && (
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-text-secondary" />
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${posColor}`}>
                    {word.part_of_speech}
                  </span>
                </div>
              )}

              {/* Example sentence */}
              {word.example_chinese && (
                <div className="rounded-lg bg-white/[0.03] p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-text-secondary/50 mb-2">
                    Example
                  </p>
                  <p className="font-chinese text-base text-text-primary leading-relaxed">
                    {word.example_chinese}
                  </p>
                  {word.example_pinyin && (
                    <p className="mt-1 text-sm text-text-pinyin">{word.example_pinyin}</p>
                  )}
                  {word.example_english && (
                    <p className="mt-1 text-sm text-text-secondary italic">{word.example_english}</p>
                  )}
                </div>
              )}

              {/* Regenerate button */}
              <button
                onClick={(e) => { e.stopPropagation(); generateDetails(true); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-[11px] text-text-secondary hover:bg-white/5 hover:text-text-primary"
              >
                <Sparkles className="h-3 w-3" /> Regenerate
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 py-2">
              <button
                onClick={(e) => { e.stopPropagation(); generateDetails(); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-china-red/10 px-3 py-1.5 text-xs font-medium text-china-red-light hover:bg-china-red/20"
              >
                <Sparkles className="h-3 w-3" /> Generate Example
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
