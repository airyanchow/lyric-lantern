import { useRef, useState, useCallback } from 'react';
import type ReactPlayer from 'react-player';

export function usePlayer() {
  const playerRef = useRef<ReactPlayer>(null);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, 'seconds');
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
    playbackRate,
    playedSeconds,
    duration,
    setPlaying,
    setPlaybackRate,
    seekTo,
    handleProgress,
    handleDuration,
  };
}
