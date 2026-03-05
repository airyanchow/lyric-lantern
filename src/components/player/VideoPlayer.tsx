import ReactPlayer from 'react-player';
import type { RefObject } from 'react';

interface VideoPlayerProps {
  url: string;
  playerRef: RefObject<any>;
  playing: boolean;
  onProgress: (state: { playedSeconds: number }) => void;
  onDuration: (duration: number) => void;
  onPlay: () => void;
  onPause: () => void;
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
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={playing}
        onProgress={onProgress as any}
        onDuration={onDuration}
        onPlay={onPlay}
        onPause={onPause}
        progressInterval={100}
        width="100%"
        height="100%"
        controls
        config={{
          youtube: {
            playerVars: {
              modestbranding: 1,
              rel: 0,
            },
          },
        } as any}
      />
    </div>
  );
}
