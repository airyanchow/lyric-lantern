import { useMemo } from 'react';
import type { LyricLine } from '../types';

interface UseSynchronizedLyricsReturn {
  currentLineIndex: number;
  currentLine: LyricLine | null;
}

export function useSynchronizedLyrics(
  lyrics: LyricLine[],
  playedSeconds: number
): UseSynchronizedLyricsReturn {
  const currentLineIndex = useMemo(() => {
    return lyrics.findIndex(
      (line) => playedSeconds >= line.startTime && playedSeconds < line.endTime
    );
  }, [lyrics, playedSeconds]);

  const currentLine = currentLineIndex >= 0 ? lyrics[currentLineIndex] : null;

  return { currentLineIndex, currentLine };
}
