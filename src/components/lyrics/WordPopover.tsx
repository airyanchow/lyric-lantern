import { useEffect, useRef, useState } from 'react';
import { BookmarkPlus, X, LogIn, Loader2 } from 'lucide-react';
import type { LyricWord } from '../../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface WordPopoverProps {
  word: LyricWord | null;
  position: { x: number; y: number };
  onSave: (word: LyricWord) => void;
  onClose: () => void;
  isLoggedIn: boolean;
}

export default function WordPopover({ word, position, onSave, onClose, isLoggedIn }: WordPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [lookedUp, setLookedUp] = useState<LyricWord | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

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

  // Auto-lookup missing pinyin/english
  useEffect(() => {
    if (!word) { setLookedUp(null); return; }

    const hasPinyin = word.pinyin && word.pinyin.trim().length > 0;
    const hasEnglish = word.english && word.english.trim().length > 0;

    if (hasPinyin && hasEnglish) {
      setLookedUp(null);
      return;
    }

    // Lookup via edge function
    let cancelled = false;
    setLookingUp(true);
    setLookedUp(null);

    (async () => {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/generate-word-details`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            mode: 'lookup',
            chinese: word.chinese,
          }),
        });

        if (!res.ok || cancelled) return;

        const data = await res.json();
        if (!cancelled && data.pinyin) {
          setLookedUp({
            chinese: word.chinese,
            pinyin: data.pinyin || '',
            english: data.english || '',
          });
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLookingUp(false);
      }
    })();

    return () => { cancelled = true; };
  }, [word?.chinese]);

  if (!word) return null;

  // Use looked-up data if available
  const displayWord = lookedUp || word;
  const hasPinyin = displayWord.pinyin && displayWord.pinyin.trim().length > 0;
  const hasEnglish = displayWord.english && displayWord.english.trim().length > 0;

  // On mobile (< 640px), center the popover horizontally
  const isMobile = window.innerWidth < 640;
  const popoverWidth = isMobile ? Math.min(280, window.innerWidth - 32) : 240;
  const clampedX = isMobile
    ? (window.innerWidth - popoverWidth) / 2
    : Math.min(Math.max(position.x - 120, 8), window.innerWidth - popoverWidth - 16);
  const clampedY = Math.min(position.y + 10, window.innerHeight - 200);

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-60 rounded-xl border border-white/10 bg-bg-card p-4 shadow-xl shadow-black/50 sm:w-60"
      style={{ left: clampedX, top: clampedY, width: isMobile ? popoverWidth : undefined }}
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

      {lookingUp ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Looking up translation...</span>
        </div>
      ) : (
        <>
          {hasPinyin ? (
            <p className="mt-1 text-sm font-medium text-text-pinyin">{displayWord.pinyin}</p>
          ) : (
            <p className="mt-1 text-xs italic text-text-secondary/50">Pinyin not available</p>
          )}
          {hasEnglish ? (
            <p className="mt-1 text-sm text-text-secondary">{displayWord.english}</p>
          ) : (
            <p className="mt-1 text-xs italic text-text-secondary/50">Translation not available</p>
          )}
        </>
      )}

      {/* Save button */}
      <div className="mt-3 border-t border-white/10 pt-3">
        {isLoggedIn ? (
          <button
            onClick={() => onSave(displayWord)}
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
