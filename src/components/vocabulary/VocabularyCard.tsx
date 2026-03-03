import { Trash2, Music } from 'lucide-react';
import type { SavedWord } from '../../types';

interface VocabularyCardProps {
  word: SavedWord;
  onDelete: (id: string) => void;
}

export default function VocabularyCard({ word, onDelete }: VocabularyCardProps) {
  return (
    <div className="group relative rounded-xl border border-white/5 bg-bg-card p-4 transition-colors hover:border-white/10">
      {/* Delete button */}
      <button
        onClick={() => onDelete(word.id)}
        className="absolute right-3 top-3 rounded-md p-1 text-text-secondary opacity-0 transition-all hover:bg-china-red/10 hover:text-china-red group-hover:opacity-100"
        title="Delete word"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Word */}
      <p className="font-chinese text-2xl font-medium text-text-primary">{word.chinese}</p>
      <p className="mt-1 text-sm font-medium text-text-pinyin">{word.pinyin}</p>
      <p className="mt-1 text-sm text-text-secondary">{word.english}</p>

      {/* Song source */}
      {word.song_title && (
        <div className="mt-3 flex items-center gap-1 text-xs text-text-secondary/60">
          <Music className="h-3 w-3" />
          <span>{word.song_title}</span>
        </div>
      )}
    </div>
  );
}
