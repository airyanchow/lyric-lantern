import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description: string;
  isPublic: boolean;
  songCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistSong {
  id: string;
  songId: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnailUrl: string;
  position: number;
}

export function usePlaylists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!user) {
      hasFetched.current = false;
      return;
    }
    if (hasFetched.current) return;
    hasFetched.current = true;

    setLoading(true);
    supabase
      .from('playlists')
      .select('*, playlist_songs(count)')
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setPlaylists(data.map((row: any) => ({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            description: row.description || '',
            isPublic: row.is_public,
            songCount: row.playlist_songs?.[0]?.count || 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          })));
        }
        setLoading(false);
      });
  }, [user]);

  const createPlaylist = useCallback(async (name: string, description: string, isPublic: boolean) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('playlists')
      .insert({ user_id: user.id, name, description, is_public: isPublic })
      .select()
      .single();

    if (!error && data) {
      const playlist: Playlist = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        description: data.description || '',
        isPublic: data.is_public,
        songCount: 0,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
      setPlaylists(prev => [playlist, ...prev]);
      return playlist;
    }
    return null;
  }, [user]);

  const deletePlaylist = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from('playlists').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete playlist:', error.message);
      return;
    }
    setPlaylists(prev => prev.filter(p => p.id !== id));
  }, [user]);

  const addSongToPlaylist = useCallback(async (playlistId: string, songId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('playlist_songs')
      .insert({ playlist_id: playlistId, song_id: songId, added_by: user.id });

    if (!error) {
      setPlaylists(prev => prev.map(p =>
        p.id === playlistId ? { ...p, songCount: p.songCount + 1 } : p
      ));
    }
  }, [user]);

  const fetchPlaylistSongs = useCallback(async (playlistId: string): Promise<PlaylistSong[]> => {
    const { data } = await supabase
      .from('playlist_songs')
      .select('*, songs(id, video_id, title, artist, thumbnail_url)')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    if (data) {
      return data
        .filter((row: any) => row.songs)
        .map((row: any) => ({
          id: row.id,
          songId: row.songs.id,
          videoId: row.songs.video_id,
          title: row.songs.title,
          artist: row.songs.artist,
          thumbnailUrl: row.songs.thumbnail_url,
          position: row.position,
        }));
    }
    return [];
  }, []);

  return { playlists, createPlaylist, deletePlaylist, addSongToPlaylist, fetchPlaylistSongs, loading };
}
