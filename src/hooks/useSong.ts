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
  loadSong: (url: string) => Promise<void>;
}

export function useSong(): UseSongReturn {
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    return url && !url.includes('placeholder');
  };

  const incrementViewCount = (videoId: string) => {
    try {
      if (isSupabaseConfigured()) {
        supabase.rpc('increment_view_count', { p_video_id: videoId }).then(() => {}).catch(() => {});
      }
    } catch {
      // Silently ignore
    }
  };

  const loadSong = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);
    setProcessingStatus(null);

    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Invalid YouTube URL. Please check the URL and try again.');
      setLoading(false);
      return;
    }

    // Check if this is the demo song (works without Supabase)
    if (videoId === demoSong.video_id) {
      setSong(demoSong);
      incrementViewCount(videoId);
      setLoading(false);
      return;
    }

    // If Supabase isn't configured, fall back to demo data for any URL
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
      // Check cache first
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

      // Cache miss — call the edge function to process
      setProcessingStatus('Processing lyrics with AI... This may take 10-15 seconds for a new song.');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/process-song`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ videoId, youtubeUrl: url }),
      });

      let processedData: any;
      try {
        processedData = await response.json();
      } catch {
        // Response body wasn't valid JSON
        throw new Error('SERVICE_UNAVAILABLE');
      }

      // Check for error responses (non-2xx or error field in response)
      if (!response.ok || processedData?.error) {
        // If the edge function returned a specific lyrics-not-found error, pass it through
        if (response.status === 404 && processedData?.error) {
          throw new Error(processedData.error);
        }
        // Everything else gets a generic user-friendly message
        throw new Error('SERVICE_UNAVAILABLE');
      }

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

      // Show user-friendly error messages
      if (message === 'SERVICE_UNAVAILABLE') {
        setError('Song cannot be translated at this time. Please check back again later.');
      } else if (message.includes('Could not find lyrics')) {
        setError('Song cannot be translated at this time. Please check back again later.');
      } else if (message.includes('No Chinese lyrics')) {
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

  return { song, loading, processingStatus, error, loadSong };
}
