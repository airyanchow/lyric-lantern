import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { extractVideoId } from '../lib/videoId';
import { demoSong } from '../data/demo-song';
import type { Song } from '../types';

interface UseSongReturn {
  song: Song | null;
  loading: boolean;
  processingStatus: string | null;
  error: string | null;
  lyricsNotFound: boolean;
  lastVideoId: string | null;
  lastVideoUrl: string | null;
  loadSong: (url: string) => Promise<void>;
  submitLyrics: (rawLyrics: string) => Promise<void>;
}

export function useSong(): UseSongReturn {
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lyricsNotFound, setLyricsNotFound] = useState(false);
  const [lastVideoId, setLastVideoId] = useState<string | null>(null);
  const [lastVideoUrl, setLastVideoUrl] = useState<string | null>(null);

  const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return url && !url.includes('placeholder');
  };

  const incrementViewCount = (videoId: string) => {
    try {
      if (isSupabaseConfigured()) {
        supabase.rpc('increment_view_count', { p_video_id: videoId }).then(() => {});
      }
    } catch {
      // Silently ignore
    }
  };

  const callEdgeFunction = async (videoId: string, youtubeUrl: string, userLyrics?: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const body: Record<string, string> = { videoId, youtubeUrl };
    if (userLyrics) body.userLyrics = userLyrics;

    const response = await fetch(`${supabaseUrl}/functions/v1/process-song`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
    });

    let processedData: any;
    try {
      processedData = await response.json();
    } catch {
      throw new Error('SERVICE_UNAVAILABLE');
    }

    if (!response.ok || processedData?.error) {
      if (response.status === 404 && processedData?.error) {
        throw new Error(processedData.error);
      }
      throw new Error('SERVICE_UNAVAILABLE');
    }

    return processedData;
  };

  const loadSong = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    setProcessingStatus(null);
    setLyricsNotFound(false);

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Invalid YouTube URL. Please check the URL and try again.');
      setLoading(false);
      return;
    }

    setLastVideoId(videoId);
    setLastVideoUrl(url);

    if (videoId === demoSong.video_id) {
      setSong(demoSong);
      incrementViewCount(videoId);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setSong({
        ...demoSong,
        video_id: videoId,
        youtubeUrl: url,
        title: 'Demo Mode',
        titleEnglish: 'Connect Supabase for full functionality',
      });
      setLoading(false);
      return;
    }

    try {
      setProcessingStatus('Checking cache...');
      const { data: cachedSong } = await supabase
        .from('songs')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (cachedSong && Array.isArray(cachedSong.lyrics) && cachedSong.lyrics.length > 0) {
        setSong({
          id: cachedSong.id,
          video_id: cachedSong.video_id,
          title: cachedSong.title,
          artist: cachedSong.artist,
          youtubeUrl: cachedSong.youtube_url,
          thumbnailUrl: cachedSong.thumbnail_url,
          lyrics: cachedSong.lyrics,
          viewCount: cachedSong.view_count,
        });
        incrementViewCount(videoId);
        setLoading(false);
        setProcessingStatus(null);
        return;
      }

      setProcessingStatus('Processing lyrics with AI... This may take 10-15 seconds for a new song.');
      const processedData = await callEdgeFunction(videoId, url);

      if (processedData) {
        setSong({
          id: processedData.id || videoId,
          video_id: processedData.video_id || videoId,
          title: processedData.title || 'Unknown Song',
          artist: processedData.artist || 'Unknown Artist',
          youtubeUrl: processedData.youtube_url || url,
          thumbnailUrl: processedData.thumbnail_url,
          lyrics: processedData.lyrics || [],
          viewCount: processedData.view_count || 1,
        });
        incrementViewCount(videoId);
      }
    } catch (err: any) {
      const message = err?.message || 'An error occurred';
      console.warn('Song loading error:', message);

      if (message.includes('Could not find lyrics') || message.includes('No Chinese lyrics')) {
        setLyricsNotFound(true);
        setError('Lyrics not found for this song. You can paste the lyrics below to translate them.');
      } else if (message === 'SERVICE_UNAVAILABLE') {
        setError('Song cannot be translated at this time. Please check back again later.');
      } else if (message.includes('Invalid YouTube URL') || message.includes('Invalid video ID')) {
        setError('Invalid YouTube URL. Please check the URL and try again.');
      } else {
        setError('Song cannot be translated at this time. Please check back again later.');
      }
    }

    setLoading(false);
    setProcessingStatus(null);
  }, []);

  const submitLyrics = useCallback(async (rawLyrics: string) => {
    if (!lastVideoId || !lastVideoUrl) return;

    setLoading(true);
    setError(null);
    setLyricsNotFound(false);
    setProcessingStatus('Translating your lyrics with AI... This may take 10-15 seconds.');

    try {
      const processedData = await callEdgeFunction(lastVideoId, lastVideoUrl, rawLyrics);

      if (processedData) {
        setSong({
          id: processedData.id || lastVideoId,
          video_id: processedData.video_id || lastVideoId,
          title: processedData.title || 'Unknown Song',
          artist: processedData.artist || 'Unknown Artist',
          youtubeUrl: processedData.youtube_url || lastVideoUrl,
          thumbnailUrl: processedData.thumbnail_url,
          lyrics: processedData.lyrics || [],
          viewCount: processedData.view_count || 1,
        });
        incrementViewCount(lastVideoId);
      }
    } catch (err: any) {
      console.warn('Lyrics submission error:', err?.message);
      setError('Could not process the submitted lyrics. Please try again.');
      setLyricsNotFound(true);
    }

    setLoading(false);
    setProcessingStatus(null);
  }, [lastVideoId, lastVideoUrl]);

  return { song, loading, processingStatus, error, lyricsNotFound, lastVideoId, lastVideoUrl, loadSong, submitLyrics };
}
