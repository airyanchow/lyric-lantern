import { useCallback, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import YouTubeInput from '../components/player/YouTubeInput';
import VideoPlayer from '../components/player/VideoPlayer';
import LyricsPanel from '../components/lyrics/LyricsPanel';
import SongCardCompact from '../components/songs/SongCardCompact';
import { usePlayer } from '../hooks/usePlayer';
import { useSong } from '../hooks/useSong';
import { useVocabulary } from '../hooks/useVocabulary';
import { supabase } from '../lib/supabase';
import { Music, BookOpen, Zap, Send } from 'lucide-react';
import ChineseLantern from '../components/icons/ChineseLantern';
import type { LyricWord } from '../types';

interface PopularSong {
  id: string;
  title: string;
  artist: string;
  thumbnail_url: string;
  youtube_url: string;
}

export default function HomePage() {
  const { song, loading: songLoading, processingStatus, error: songError, lyricsNotFound, loadSong, submitLyrics } = useSong();
  const { saveWord } = useVocabulary();
  const player = usePlayer();
  const location = useLocation();
  const navigate = useNavigate();
  const [popularSongs, setPopularSongs] = useState<PopularSong[]>([]);
  const [userLyricsText, setUserLyricsText] = useState('');
  const [lyricsMode, setLyricsMode] = useState<'chinese' | 'pretranslated'>('chinese');

  // Fetch top 20 popular songs for the landing page
  useEffect(() => {
    supabase
      .from('songs')
      .select('id, title, artist, thumbnail_url, youtube_url')
      .order('view_count', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setPopularSongs(data); });
  }, []);

  // Auto-load song when navigating from Browse page
  const songUrlFromState = (location.state as { songUrl?: string })?.songUrl;
  useEffect(() => {
    if (songUrlFromState) {
      loadSong(songUrlFromState);
      navigate('/', { replace: true, state: {} });
    }
  }, [songUrlFromState, loadSong, navigate]);

  const [toast, setToast] = useState<string | null>(null);

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

  const handleSubmitLyrics = useCallback(async () => {
    if (!userLyricsText.trim()) return;
    await submitLyrics(userLyricsText, lyricsMode);
    setUserLyricsText('');
  }, [userLyricsText, lyricsMode, submitLyrics]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* URL Input */}
      <div className="mb-6">
        <YouTubeInput
          onSubmit={loadSong}
          loading={songLoading}
          defaultUrl={songUrlFromState || ''}
        />
        {songError && <p className="mt-2 text-sm text-china-red">{songError}</p>}
        {processingStatus && (
          <div className="mt-2 flex items-center gap-2 text-sm text-text-pinyin">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-text-pinyin border-t-transparent" />
            {processingStatus}
          </div>
        )}
      </div>

      {/* Lyrics Submission Form - shown when lyrics not found */}
      {lyricsNotFound && !songLoading && (
        <div className="mb-6 rounded-xl border border-white/10 bg-bg-card p-5">
          <h3 className="mb-2 text-sm font-semibold text-text-primary">Submit Lyrics</h3>

          {/* Mode tabs */}
          <div className="mb-3 flex gap-1 rounded-lg bg-bg-primary p-1">
            <button
              onClick={() => setLyricsMode('chinese')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                lyricsMode === 'chinese'
                  ? 'bg-china-red text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Chinese Only
            </button>
            <button
              onClick={() => setLyricsMode('pretranslated')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                lyricsMode === 'pretranslated'
                  ? 'bg-china-red text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Pre-translated
            </button>
          </div>

          <p className="mb-3 text-xs text-text-secondary">
            {lyricsMode === 'chinese'
              ? "Paste the Chinese lyrics below and we'll add pinyin and English translations."
              : "Paste lyrics with translations. Format each line as: Chinese | Pinyin | English"}
          </p>
          <textarea
            value={userLyricsText}
            onChange={(e) => setUserLyricsText(e.target.value)}
            placeholder={
              lyricsMode === 'chinese'
                ? "Paste Chinese lyrics here, one line per line..."
                : "我爱你 | wǒ ài nǐ | I love you\n你好吗 | nǐ hǎo ma | How are you"
            }
            className="w-full rounded-lg border border-white/10 bg-bg-primary p-3 font-chinese text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-china-red focus:outline-none"
            rows={8}
          />
          <button
            onClick={handleSubmitLyrics}
            disabled={!userLyricsText.trim() || songLoading}
            className="mt-3 flex items-center gap-2 rounded-lg bg-china-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-china-red/80 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {lyricsMode === 'chinese' ? 'Translate & Show' : 'Show Lyrics'}
          </button>
        </div>
      )}

      {/* Main Content */}
      {song ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          {/* Left Column: Video */}
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
              onProgress={player.handleProgress}
              onDuration={player.handleDuration}
              onPlay={() => player.setPlaying(true)}
              onPause={() => player.setPlaying(false)}
            />
          </div>

          {/* Right Column: Lyrics */}
          <div className="h-[calc(100vh-12rem)] lg:sticky lg:top-20">
            <LyricsPanel
              lyrics={song.lyrics}
              songTitle={song.title}
              onSaveWord={handleSaveWord}
            />
          </div>
        </div>
      ) : (
        /* Landing Hero when no song is loaded */
        !lyricsNotFound && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <ChineseLantern className="h-16 w-16 opacity-60" />
            <h1 className="mt-6 text-3xl font-bold md:text-4xl">
              Learn Chinese Through <span className="text-china-red">Music</span>
            </h1>
            <p className="mt-3 max-w-lg text-text-secondary">
              Paste any YouTube URL of a Chinese song above. We'll show you lyrics
              with pinyin and English translations so you can learn as you listen.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/5 bg-bg-card p-4 text-center">
                <Music className="mx-auto h-8 w-8 text-china-red/60" />
                <p className="mt-2 text-sm font-medium">Lyrics</p>
                <p className="mt-1 text-xs text-text-secondary">Chinese, Pinyin, English</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-bg-card p-4 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-china-red/60" />
                <p className="mt-2 text-sm font-medium">Save Vocabulary</p>
                <p className="mt-1 text-xs text-text-secondary">Click any word to learn and save it</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-bg-card p-4 text-center">
                <Zap className="mx-auto h-8 w-8 text-china-red/60" />
                <p className="mt-2 text-sm font-medium">Learn Anywhere</p>
                <p className="mt-1 text-xs text-text-secondary">Works on any device, any time</p>
              </div>
            </div>

            {/* Popular Songs - Grid Layout */}
            {popularSongs.length > 0 && (
              <div className="mt-12 w-full max-w-5xl">
                <h2 className="mb-4 text-lg font-semibold">Popular Songs</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {popularSongs.map((s) => (
                    <SongCardCompact
                      key={s.id}
                      title={s.title}
                      artist={s.artist}
                      thumbnailUrl={s.thumbnail_url}
                      onClick={() => loadSong(s.youtube_url)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
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
