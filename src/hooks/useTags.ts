import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

interface SongTag {
  id: string;
  songId: string;
  userId: string;
  tag: string;
  createdAt: string;
}

interface TagCount {
  tag: string;
  count: number;
}

export function useTags(songId?: string) {
  const { user } = useAuth();
  const [tags, setTags] = useState<SongTag[]>([]);
  const [popularTags, setPopularTags] = useState<TagCount[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch tags for a specific song
  useEffect(() => {
    if (!songId) return;
    setLoading(true);
    supabase
      .from('song_tags')
      .select('*')
      .eq('song_id', songId)
      .then(({ data, error }) => {
        if (!error && data) {
          setTags(data.map(row => ({
            id: row.id,
            songId: row.song_id,
            userId: row.user_id,
            tag: row.tag,
            createdAt: row.created_at,
          })));
        }
        setLoading(false);
      });
  }, [songId]);

  // Fetch popular tags across all songs
  const fetchPopularTags = useCallback(async () => {
    const { data } = await supabase
      .from('song_tags')
      .select('tag');

    if (data) {
      const counts = new Map<string, number>();
      for (const row of data) {
        counts.set(row.tag, (counts.get(row.tag) || 0) + 1);
      }
      const sorted = Array.from(counts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
      setPopularTags(sorted);
    }
  }, []);

  const addTag = useCallback(async (tag: string) => {
    if (!user || !songId) return;
    const normalizedTag = tag.trim().toLowerCase();
    if (!normalizedTag) return;

    // Check if already added by this user
    const existing = tags.find(t => t.tag === normalizedTag && t.userId === user.id);
    if (existing) return;

    const { data, error } = await supabase
      .from('song_tags')
      .insert({ song_id: songId, user_id: user.id, tag: normalizedTag })
      .select()
      .single();

    if (!error && data) {
      setTags(prev => [...prev, {
        id: data.id,
        songId: data.song_id,
        userId: data.user_id,
        tag: data.tag,
        createdAt: data.created_at,
      }]);
    }
  }, [user, songId, tags]);

  const removeTag = useCallback(async (tagId: string) => {
    if (!user) return;
    const { error } = await supabase.from('song_tags').delete().eq('id', tagId).eq('user_id', user.id);
    if (error) {
      console.error('Failed to remove tag:', error.message);
      return;
    }
    setTags(prev => prev.filter(t => t.id !== tagId));
  }, [user]);

  // Get unique tags with counts for this song
  const songTagCounts = tags.reduce<TagCount[]>((acc, t) => {
    const existing = acc.find(a => a.tag === t.tag);
    if (existing) existing.count++;
    else acc.push({ tag: t.tag, count: 1 });
    return acc;
  }, []);

  return { tags, songTagCounts, popularTags, fetchPopularTags, addTag, removeTag, loading };
}
