import { useCallback, useState } from 'react';
import YouTubeInput from '../components/player/YouTubeInput';
import VideoPlayer from '../components/player/VideoPlayer';
import SpeedControl from '../components/player/SpeedControl';
import LyricsPanel from '../components/lyrics/LyricsPanel';
import { usePlayer } from '../hooks/usePlayer';
import { useSynchronizedLyrics } from '../hooks/useSynchronizedLyrics';
import { useSong } from '../hooks/useSong';
import { useVocabulary } from '../hooks/useVocabulary';
import { Music, BookOpen, Zap } from 'lucide-react';
import ChineseLantern from '../components/icons/ChineseLantern';
import type { LyricWord } from '../types';

export default function HomePage() {
  const { song, loading: songLoading, processingStatus, error: songError, loadSong } = useSong();
  const { saveWord } = useVocabulary();
  const player = usePlayer();
  const { currentLineIndex } = useSynchronizedLyrics(
    song?.lyrics || [],
    player.playedSeconds
  );
  const [toast, setToast] = useState<string | null>(null);

  const handleLineClick = useCallback(
    (startTime: number) => {
      player.seekTo(startTime);
      if (!player.playing) player.setPlaying(true);
    },
    [player]
  );

  const handleSaveWord = useCallback(
    async (word: LyricWord, songTitle?: string) => {
      try {
        await saveWord(word, songTitle);
        setToast(`"${word.chinese}" saved!`);
        setTimeout(() => setToast(null), 2000);
      } catch {
        setToast('Failed to save word');
        setTimeout(() => setToast(null), 2000);
      }
    },
    [saveWord]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* URL Input */}
      <div className="mb-6">
        <YouTubeInput
          onSubmit={loadSong}
          loading={songLoading}
          defaultUrl="https://www.youtube.com/watch?v=HegSBovl24I"
        />
        {songError && <p className="mt-2 text-sm text-china-red">{songError}</p>}
        {processingStatus && (
          <div className="mt-2 flex items-center gap-2 text-sm text-text-pinyin">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-text-pinyin border-t-transparent" />
            {processingStatus}
          </div>
        )}
      </div>

      {/* Main Content */}
      {song ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          {/* Left Column: Video + Controls */}
          <div className="space-y-4">
            {/* Song Info */}
            <div className="flex items-center gap-3">
              <div>
                <h1 className="font-chinese text-xl font-bold">
                  {song.title}
                  {song.titleEnglish && (
                    <span className="ml-2 text-base font-normal text-text-secondary">
                      {song.titleEnglish}
                    </span>
                  )}
                </h1>
                <p className="text-sm text-text-secondary">{song.artist}</p>
              </div>
            </div>

            {/* Video Player */}
            <VideoPlayer
              url={song.youtubeUrl}
              playerRef={player.playerRef}
              playing={player.playing}
              playbackRate={player.playbackRate}
              onProgress={player.handleProgress}
              onDuration={player.handleDuration}
              onPlay={() => player.setPlaying(true)}
              onPause={() => player.setPlaying(false)}
            />

            {/* Speed Control */}
            <SpeedControl
              currentSpeed={player.playbackRate}
              onSpeedChange={player.setPlaybackRate}
            />
          </div>

          {/* Right Column: Lyrics */}
          <div className="h-[calc(100vh-12rem)] lg:sticky lg:top-20">
            <LyricsPanel
              lyrics={song.lyrics}
              currentLineIndex={currentLineIndex}
              onLineClick={handleLineClick}
              songTitle={song.title}
              onSaveWord={handleSaveWord}
            />
          </div>
        </div>
      ) : (
        /* Landing Hero when no song is loaded */
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <ChineseLantern className="h-16 w-16 opacity-60" />
          <h1 className="mt-6 text-3xl font-bold md:text-4xl">
            Learn Chinese Through <span className="text-china-red">Music</span>
          </h1>
          <p className="mt-3 max-w-lg text-text-secondary">
            Paste any YouTube URL of a Chinese song above. We'll show you synchronized lyrics
            with pinyin and English translations so you can learn as you listen.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/5 bg-bg-card p-4 text-center">
              <Music className="mx-auto h-8 w-8 text-china-red/60" />
              <p className="mt-2 text-sm font-medium">Karaoke Lyrics</p>
              <p className="mt-1 text-xs text-text-secondary">Synchronized Chinese, Pinyin, English</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-bg-card p-4 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-china-red/60" />
              <p className="mt-2 text-sm font-medium">Save Vocabulary</p>
              <p className="mt-1 text-xs text-text-secondary">Click any word to learn and save it</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-bg-card p-4 text-center">
              <Zap className="mx-auto h-8 w-8 text-china-red/60" />
              <p className="mt-2 text-sm font-medium">Speed Control</p>
              <p className="mt-1 text-xs text-text-secondary">Slow down to catch every word</p>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-bg-card px-4 py-2 text-sm font-medium shadow-lg shadow-black/50 border border-white/10">
          {toast}
        </div>
      )}
    </div>
  );
}
