import { useEffect, useRef } from 'react';
import { BookmarkPlus, X, LogIn } from 'lucide-react';
import type { LyricWord } from '../../types';

interface WordPopoverProps {
  word: LyricWord | null;
  position: { x: number; y: number };
  onSave: (word: LyricWord) => void;
  onClose: () => void;
  isLoggedIn: boolean;
}

export default function WordPopover({ word, position, onSave, onClose, isLoggedIn }: WordPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!word) return null;

  // Clamp position to stay within viewport
  const clampedX = Math.min(Math.max(position.x - 120, 8), window.innerWidth - 260);
  const clampedY = Math.min(position.y + 10, window.innerHeight - 200);

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-60 rounded-xl border border-white/10 bg-bg-card p-4 shadow-xl shadow-black/50"
      style={{ left: clampedX, top: clampedY }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-2 top-2 rounded-md p-1 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Word details */}
      <p className="font-chinese text-3xl font-medium text-text-primary">{word.chinese}</p>
      <p className="mt-1 text-sm font-medium text-text-pinyin">{word.pinyin}</p>
      <p className="mt-1 text-sm text-text-secondary">{word.english}</p>

      {/* Save button */}
      <div className="mt-3 border-t border-white/10 pt-3">
        {isLoggedIn ? (
          <button
            onClick={() => onSave(word)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-china-red/10 px-3 py-2 text-sm font-medium text-china-red transition-colors hover:bg-china-red/20"
          >
            <BookmarkPlus className="h-4 w-4" />
            Save to Vocabulary
          </button>
        ) : (
          <a
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary no-underline"
          >
            <LogIn className="h-4 w-4" />
            Sign in to save words
          </a>
        )}
      </div>
    </div>
  );
}
