import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ThumbsUp, Languages } from 'lucide-react';
import { useTranslations } from '../../hooks/useTranslations';
import { useAuth } from '../../hooks/useAuth';
import type { LyricLine } from '../../types';
import SubmitTranslationModal from './SubmitTranslationModal';

interface TranslationSelectorProps {
  songId: string;
  lyrics?: LyricLine[];
  onTranslationChange: (overrides: Map<number, string> | null) => void;
}

export default function TranslationSelector({ songId, lyrics, onTranslationChange }: TranslationSelectorProps) {
  const { user } = useAuth();
  const {
    translations,
    selectedTranslationId,
    setSelectedTranslationId,
    englishOverrides,
    toggleVote,
    loading,
  } = useTranslations(songId);

  const [isOpen, setIsOpen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Notify parent when selection changes
  useEffect(() => {
    onTranslationChange(englishOverrides);
  }, [englishOverrides, onTranslationChange]);

  const handleSelect = (id: string | null) => {
    setSelectedTranslationId(id);
    setIsOpen(false);
  };

  const selectedLabel = selectedTranslationId
    ? translations.find((t) => t.id === selectedTranslationId)
      ? `by @${translations.find((t) => t.id === selectedTranslationId)!.userName}`
      : 'Default Translation'
    : 'Default Translation';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-bg-secondary px-3 py-2 text-sm text-text-primary transition-colors hover:border-china-red/30"
      >
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-china-red" />
          <span className="truncate">{selectedLabel}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel — opens upward to avoid overflow in the lyrics panel */}
      {isOpen && (
        <div className="absolute bottom-full z-20 mb-1 w-full rounded-lg border border-white/10 bg-bg-card shadow-xl">
          <div className="max-h-64 overflow-y-auto p-1">
            {/* Default option */}
            <button
              onClick={() => handleSelect(null)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 ${
                !selectedTranslationId ? 'bg-china-red/10 text-china-red-light' : 'text-text-primary'
              }`}
            >
              Default Translation
            </button>

            {/* Community translations sorted by upvotes */}
            {translations.map((t) => (
              <div
                key={t.id}
                className={`flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-white/5 ${
                  selectedTranslationId === t.id ? 'bg-china-red/10' : ''
                }`}
              >
                <button
                  onClick={() => handleSelect(t.id)}
                  className={`flex-1 text-left text-sm ${
                    selectedTranslationId === t.id ? 'text-china-red-light' : 'text-text-primary'
                  }`}
                >
                  by @{t.userName}{' '}
                  <span className="text-text-secondary">({t.upvotes} votes)</span>
                </button>
                {user && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVote(t.id);
                    }}
                    className={`ml-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
                      t.hasVoted
                        ? 'bg-china-red/20 text-china-red-light'
                        : 'text-text-secondary hover:bg-white/10 hover:text-text-primary'
                    }`}
                  >
                    <ThumbsUp className="h-3 w-3" />
                    {t.upvotes}
                  </button>
                )}
              </div>
            ))}

            {translations.length === 0 && !loading && (
              <p className="px-3 py-2 text-sm text-text-secondary">
                No community translations yet
              </p>
            )}
          </div>

          {/* Submit button */}
          {user && lyrics && (
            <div className="border-t border-white/10 p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowSubmitModal(true);
                }}
                className="w-full rounded-md bg-china-red/10 px-3 py-2 text-sm font-medium text-china-red-light transition-colors hover:bg-china-red/20"
              >
                Submit Your Translation
              </button>
            </div>
          )}
        </div>
      )}

      {/* Submit modal */}
      {lyrics && (
        <SubmitTranslationModal
          songId={songId}
          lyrics={lyrics}
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
        />
      )}
    </div>
  );
}
