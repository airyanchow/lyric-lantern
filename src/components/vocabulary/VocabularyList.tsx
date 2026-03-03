import { BookOpen } from 'lucide-react';
import VocabularyCard from './VocabularyCard';
import type { SavedWord } from '../../types';

interface VocabularyListProps {
  words: SavedWord[];
  loading: boolean;
  onDelete: (id: string) => void;
}

export default function VocabularyList({ words, loading, onDelete }: VocabularyListProps) {
  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading your vocabulary...</div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <BookOpen className="h-12 w-12 text-text-secondary/30" />
        <h3 className="mt-4 text-lg font-medium text-text-primary">No saved words yet</h3>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">
          Start learning by clicking on Chinese words in the lyrics. You can save any word to review later.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {words.map((word) => (
        <VocabularyCard key={word.id} word={word} onDelete={onDelete} />
      ))}
    </div>
  );
}
