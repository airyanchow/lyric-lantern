import { useState, useCallback } from 'react';
import { BookOpen, Download, Search, Layers, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import VocabularyList from '../components/vocabulary/VocabularyList';
import { POS_COLORS } from '../components/vocabulary/VocabularyCard';
import { useVocabulary } from '../hooks/useVocabulary';
import { exportToAnki } from '../utils/ankiExport';
import type { SavedWord } from '../types';

const POS_KEY_ITEMS = [
  { label: 'Noun', key: 'noun' },
  { label: 'Verb', key: 'verb' },
  { label: 'Adjective', key: 'adjective' },
  { label: 'Adverb', key: 'adverb' },
  { label: 'Pronoun', key: 'pronoun' },
  { label: 'Preposition', key: 'preposition' },
  { label: 'Conjunction', key: 'conjunction' },
  { label: 'Particle', key: 'particle' },
  { label: 'Measure Word', key: 'measure word' },
  { label: 'Interjection', key: 'interjection' },
  { label: 'Auxiliary Verb', key: 'auxiliary verb' },
  { label: 'Phrase', key: 'phrase' },
];

export default function VocabularyPage() {
  const { words, loading, deleteWord, updateWordLocally } = useVocabulary();
  const [search, setSearch] = useState('');
  const [showPosKey, setShowPosKey] = useState(false);

  const filtered = search.trim()
    ? words.filter(w =>
        w.chinese.includes(search) ||
        w.pinyin.toLowerCase().includes(search.toLowerCase()) ||
        w.english.toLowerCase().includes(search.toLowerCase())
      )
    : words;

  const handleWordUpdated = useCallback((updated: SavedWord) => {
    updateWordLocally(updated);
  }, [updateWordLocally]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-china-red" />
          <div>
            <h1 className="text-2xl font-bold">My Vocabulary</h1>
            <p className="text-sm text-text-secondary">
              {words.length} word{words.length !== 1 ? 's' : ''} saved
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPosKey(prev => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
              showPosKey
                ? 'border-china-red/30 bg-china-red/10 text-china-red-light'
                : 'border-white/10 text-text-secondary hover:bg-white/5 hover:text-text-primary'
            }`}
            aria-label="Toggle part of speech color key"
            aria-pressed={showPosKey}
          >
            <Info className="h-4 w-4" /> Color Key
          </button>
          <Link
            to="/flashcards"
            className="inline-flex items-center gap-1.5 rounded-lg bg-china-red/10 px-3 py-2 text-sm font-medium text-china-red-light no-underline hover:bg-china-red/20"
          >
            <Layers className="h-4 w-4" /> Practice Flashcards
          </Link>
          {words.length > 0 && (
            <button
              onClick={() => exportToAnki(words)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary"
            >
              <Download className="h-4 w-4" /> Export to Anki
            </button>
          )}
        </div>
      </div>

      {/* Part of Speech Color Key */}
      {showPosKey && (
        <div className="mb-6 rounded-xl border border-white/10 bg-bg-card p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-secondary">
            Part of Speech Colors
          </p>
          <div className="flex flex-wrap gap-2">
            {POS_KEY_ITEMS.map(({ label, key }) => {
              const color = POS_COLORS[key] || 'bg-white/10 text-text-secondary';
              return (
                <span
                  key={key}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${color}`}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      {words.length > 0 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search words..."
            className="w-full rounded-xl border border-white/10 bg-bg-secondary py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder-text-secondary/50 outline-none focus:border-china-red/50"
          />
        </div>
      )}

      <VocabularyList words={filtered} loading={loading} onDelete={deleteWord} onWordUpdated={handleWordUpdated} />
    </div>
  );
}
