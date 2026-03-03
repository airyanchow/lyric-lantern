import { useRef, useEffect, useState, useCallback } from 'react';
import LyricLine from './LyricLine';
import WordPopover from './WordPopover';
import { useAuth } from '../../hooks/useAuth';
import type { LyricLine as LyricLineType, LyricWord } from '../../types';

interface LyricsPanelProps {
  lyrics: LyricLineType[];
  currentLineIndex: number;
  onLineClick: (startTime: number) => void;
  songTitle?: string;
  onSaveWord?: (word: LyricWord, songTitle?: string) => void;
}

export default function LyricsPanel({
  lyrics,
  currentLineIndex,
  onLineClick,
  songTitle,
  onSaveWord,
}: LyricsPanelProps) {
  const { user } = useAuth();
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [selectedWord, setSelectedWord] = useState<LyricWord | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });

  // Auto-scroll to active line
  useEffect(() => {
    if (currentLineIndex >= 0 && lineRefs.current[currentLineIndex]) {
      lineRefs.current[currentLineIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLineIndex]);

  const handleWordClick = useCallback((word: LyricWord, event: React.MouseEvent) => {
    setSelectedWord(word);
    setPopoverPos({ x: event.clientX, y: event.clientY });
  }, []);

  const handleSaveWord = useCallback(
    (word: LyricWord) => {
      if (onSaveWord) {
        onSaveWord(word, songTitle);
      }
      setSelectedWord(null);
    },
    [onSaveWord, songTitle]
  );

  const handleClosePopover = useCallback(() => {
    setSelectedWord(null);
  }, []);

  if (lyrics.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 p-8 text-center">
        <p className="text-text-secondary">
          Paste a YouTube URL above to see synchronized lyrics here
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto rounded-xl bg-bg-secondary/50 p-4">
      <div className="space-y-2">
        {lyrics.map((line, index) => (
          <LyricLine
            key={line.id}
            line={line}
            isActive={index === currentLineIndex}
            onClick={() => onLineClick(line.startTime)}
            onWordClick={handleWordClick}
            lineRef={(el) => {
              lineRefs.current[index] = el;
            }}
          />
        ))}
      </div>

      {/* Word Popover */}
      <WordPopover
        word={selectedWord}
        position={popoverPos}
        onSave={handleSaveWord}
        onClose={handleClosePopover}
        isLoggedIn={!!user}
      />
    </div>
  );
}
