import { useRef, useState, useCallback } from 'react';
export function usePlayer() {
  const playerRef = useRef<YT.Player | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
    setPlayedSeconds(seconds);
  }, []);

  const handleProgress = useCallback((state: { playedSeconds: number }) => {
    setPlayedSeconds(state.playedSeconds);
  }, []);

  const handleDuration = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  return {
    playerRef,
    playing,
    playedSeconds,
    duration,
    setPlaying,
    seekTo,
    handleProgress,
    handleDuration,
  };
}
