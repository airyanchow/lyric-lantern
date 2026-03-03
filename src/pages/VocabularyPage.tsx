import { BookOpen } from 'lucide-react';
import VocabularyList from '../components/vocabulary/VocabularyList';
import { useVocabulary } from '../hooks/useVocabulary';

export default function VocabularyPage() {
  const { words, loading, deleteWord } = useVocabulary();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-china-red" />
          <div>
            <h1 className="text-2xl font-bold">My Vocabulary</h1>
            <p className="text-sm text-text-secondary">
              {words.length} word{words.length !== 1 ? 's' : ''} saved
            </p>
          </div>
        </div>
      </div>
      <VocabularyList words={words} loading={loading} onDelete={deleteWord} />
    </div>
  );
}
