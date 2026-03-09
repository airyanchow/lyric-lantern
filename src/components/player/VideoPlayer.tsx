import { useEffect, useRef, useCallback } from 'react';
import { extractVideoId } from '../../lib/videoId';

interface VideoPlayerProps {
  url: string;
  playerRef: React.MutableRefObject<YT.Player | null>;
  playing: boolean;
  onProgress: (state: { playedSeconds: number }) => void;
  onDuration: (duration: number) => void;
  onPlay: () => void;
  onPause: () => void;
}

// Load the YouTube IFrame API script once
let apiReady = false;
let apiPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiReady) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    if (window.YT && window.YT.Player) {
      apiReady = true;
      resolve();
      return;
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      apiReady = true;
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return apiPromise;
}

export default function VideoPlayer({
  url,
  playerRef,
  playing,
  onProgress,
  onDuration,
  onPlay,
  onPause,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  const currentVideoId = useRef<string | null>(null);

  const startProgressInterval = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = window.setInterval(() => {
      const p = playerRef.current;
      if (p && typeof p.getCurrentTime === 'function') {
        onProgress({ playedSeconds: p.getCurrentTime() });
      }
    }, 100);
  }, [playerRef, onProgress]);

  const stopProgressInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initialize or update player when URL changes
  useEffect(() => {
    const videoId = extractVideoId(url);
    if (!videoId || !containerRef.current) return;

    let destroyed = false;

    loadYouTubeAPI().then(() => {
      if (destroyed || !containerRef.current) return;

      // If player exists and video changed, load new video
      if (playerRef.current && currentVideoId.current !== videoId) {
        currentVideoId.current = videoId;
        playerRef.current.loadVideoById(videoId);
        return;
      }

      // Same video, skip
      if (playerRef.current && currentVideoId.current === videoId) return;

      currentVideoId.current = videoId;

      const el = document.createElement('div');
      containerRef.current!.innerHTML = '';
      containerRef.current!.appendChild(el);

      playerRef.current = new YT.Player(el, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event: YT.PlayerEvent) => {
            onDuration(event.target.getDuration());
          },
          onStateChange: (event: YT.OnStateChangeEvent) => {
            if (event.data === YT.PlayerState.PLAYING) {
              onPlay();
              startProgressInterval();
              onDuration(event.target.getDuration());
            } else if (event.data === YT.PlayerState.PAUSED) {
              onPause();
              stopProgressInterval();
            } else if (event.data === YT.PlayerState.ENDED) {
              onPause();
              stopProgressInterval();
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external playing state changes
  useEffect(() => {
    const p = playerRef.current;
    if (!p || typeof p.getPlayerState !== 'function') return;
    try {
      const state = p.getPlayerState();
      if (playing && state !== YT.PlayerState.PLAYING) {
        p.playVideo();
      } else if (!playing && state === YT.PlayerState.PLAYING) {
        p.pauseVideo();
      }
    } catch {
      // Player not ready yet
    }
  }, [playing, playerRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProgressInterval();
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
