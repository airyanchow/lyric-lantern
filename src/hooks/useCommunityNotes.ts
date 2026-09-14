import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

interface CommunityNote {
  id: string;
  songId: string;
  lineId: number;
  userId: string;
  userName: string;
  content: string;
  upvotes: number;
  createdAt: string;
}

export function useCommunityNotes(songId?: string) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<CommunityNote[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!songId) return;
    setLoading(true);

    supabase
      .from('community_notes')
      .select('*, profiles(display_name)')
      .eq('song_id', songId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setNotes(data.map((row: any) => ({
            id: row.id,
            songId: row.song_id,
            lineId: row.line_id,
            userId: row.user_id,
            userName: row.profiles?.display_name || 'Anonymous',
            content: row.content,
            upvotes: row.upvotes,
            createdAt: row.created_at,
          })));
        }
        setLoading(false);
      });
  }, [songId]);

  const addNote = useCallback(async (lineId: number, content: string) => {
    if (!user || !songId || !content.trim()) return;

    const { data, error } = await supabase
      .from('community_notes')
      .insert({ song_id: songId, line_id: lineId, user_id: user.id, content: content.trim() })
      .select('*, profiles(display_name)')
      .single();

    if (!error && data) {
      setNotes(prev => [{
        id: data.id,
        songId: data.song_id,
        lineId: data.line_id,
        userId: data.user_id,
        userName: (data as any).profiles?.display_name || 'Anonymous',
        content: data.content,
        upvotes: 0,
        createdAt: data.created_at,
      }, ...prev]);
    }
  }, [user, songId]);

  const deleteNote = useCallback(async (noteId: string) => {
    if (!user) return;
    const { error } = await supabase.from('community_notes').delete().eq('id', noteId);
    if (error) {
      console.error('Failed to delete note:', error.message);
      return;
    }
    setNotes(prev => prev.filter(n => n.id !== noteId));
  }, [user]);

  const reportContent = useCallback(async (targetType: string, targetId: string, reason: string) => {
    if (!user) return;
    const { error } = await supabase.from('content_reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
    });
    if (error) console.error('Failed to submit report:', error.message);
  }, [user]);

  // Get notes grouped by line
  const notesByLine = notes.reduce<Map<number, CommunityNote[]>>((acc, note) => {
    const existing = acc.get(note.lineId) || [];
    existing.push(note);
    acc.set(note.lineId, existing);
    return acc;
  }, new Map());

  return { notes, notesByLine, addNote, deleteNote, reportContent, loading };
}
