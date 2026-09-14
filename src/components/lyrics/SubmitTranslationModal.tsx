import { useState } from 'react';
import { X, Send } from 'lucide-react';
import { useTranslations } from '../../hooks/useTranslations';
import type { LyricLine } from '../../types';

interface SubmitTranslationModalProps {
  songId: string;
  lyrics: LyricLine[];
  isOpen: boolean;
  onClose: () => void;
}

export default function SubmitTranslationModal({ songId, lyrics, isOpen, onClose }: SubmitTranslationModalProps) {
  const { submitTranslation, loading } = useTranslations(songId);
  const [displayName, setDisplayName] = useState('');
  const [lines, setLines] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    for (const line of lyrics) {
      initial[line.id] = line.english;
    }
    return initial;
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLineChange = (lineId: number, value: string) => {
    setLines((prev) => ({ ...prev, [lineId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setSubmitting(true);
    const translationLines = lyrics.map((line) => ({
      lineId: line.id,
      english: lines[line.id] || line.english,
    }));

    await submitTranslation(translationLines, displayName.trim());
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Submit Your Translation
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          {/* Display name */}
          <div className="border-b border-white/10 px-6 py-4">
            <label className="mb-1.5 block text-sm font-medium text-text-secondary">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or alias"
              required
              maxLength={50}
              className="w-full rounded-lg border border-white/10 bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-secondary outline-none transition-colors focus:border-china-red/50"
            />
          </div>

          {/* Lines */}
          <div className="max-h-[50vh] overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {lyrics.map((line) => (
                <div key={line.id} className="space-y-1.5">
                  <p className="font-chinese text-base text-text-primary">
                    {line.chinese}
                    <span className="ml-2 text-sm text-text-pinyin">
                      {line.pinyin}
                    </span>
                  </p>
                  <input
                    type="text"
                    value={lines[line.id] || ''}
                    onChange={(e) => handleLineChange(line.id, e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-bg-secondary px-3 py-1.5 text-sm text-text-primary outline-none transition-colors focus:border-china-red/50"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!displayName.trim() || submitting || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-china-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-china-red-light disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Submitting...' : 'Submit Translation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
