import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

interface FavoriteSong {
  songId: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  createdAt: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteSong[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!user) {
      hasFetched.current = false;
      setFavorites([]);
      setFavoriteIds(new Set());
      return;
    }
    if (hasFetched.current) return;
    hasFetched.current = true;

    setLoading(true);
    supabase
      .from('song_favorites')
      .select('song_id, created_at, songs(id, video_id, title, artist, thumbnail_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const mapped: FavoriteSong[] = data
            .filter((row: any) => row.songs)
            .map((row: any) => ({
              songId: row.song_id,
              videoId: row.songs.video_id,
              title: row.songs.title,
              artist: row.songs.artist,
              thumbnailUrl: row.songs.thumbnail_url,
              createdAt: row.created_at,
            }));
          setFavorites(mapped);
          setFavoriteIds(new Set(mapped.map(f => f.songId)));
        }
        setLoading(false);
      });
  }, [user]);

  const isFavorited = useCallback((songId: string) => {
    return favoriteIds.has(songId);
  }, [favoriteIds]);

  const toggleFavorite = useCallback(async (songId: string) => {
    if (!user || toggling) return;
    setToggling(true);

    try {
    if (favoriteIds.has(songId)) {
      // Optimistic update
      setFavoriteIds(prev => {
        const next = new Set(prev);
        next.delete(songId);
        return next;
      });
      setFavorites(prev => prev.filter(f => f.songId !== songId));

      const { error } = await supabase
        .from('song_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('song_id', songId);

      if (error) {
        // Revert on failure
        setFavoriteIds(prev => new Set(prev).add(songId));
        console.error('Failed to remove favorite:', error.message);
      }
    } else {
      // Optimistic update
      setFavoriteIds(prev => new Set(prev).add(songId));

      const { error } = await supabase
        .from('song_favorites')
        .insert({ user_id: user.id, song_id: songId });

      if (error) {
        // Revert on failure
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(songId);
          return next;
        });
        console.error('Failed to add favorite:', error.message);
        return;
      }

      // Fetch song details to add to favorites list
      const { data: song } = await supabase
        .from('songs')
        .select('id, video_id, title, artist, thumbnail_url')
        .eq('id', songId)
        .single();

      if (song) {
        setFavorites(prev => [{
          songId: song.id,
          videoId: song.video_id,
          title: song.title,
          artist: song.artist,
          thumbnailUrl: song.thumbnail_url,
          createdAt: new Date().toISOString(),
        }, ...prev]);
      }
    }
    } finally {
      setToggling(false);
    }
  }, [user, favoriteIds, toggling]);

  return { favorites, favoriteIds, isFavorited, toggleFavorite, loading, toggling };
}
