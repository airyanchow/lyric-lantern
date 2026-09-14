import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';

interface ArtisticTranslation {
  id: string;
  songId: string;
  userId: string;
  userName: string;
  lines: { lineId: number; english: string }[];
  upvotes: number;
  hasVoted: boolean;
  createdAt: string;
}

export function useTranslations(songId?: string) {
  const { user } = useAuth();
  const [translations, setTranslations] = useState<ArtisticTranslation[]>([]);
  const [selectedTranslationId, setSelectedTranslationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!songId) return;
    setLoading(true);

    const fetchTranslations = async () => {
      const { data } = await supabase
        .from('artistic_translations')
        .select('*')
        .eq('song_id', songId)
        .order('upvotes', { ascending: false });

      if (data) {
        // Check which ones the current user has voted on
        let votedIds = new Set<string>();
        if (user) {
          const { data: votes } = await supabase
            .from('translation_votes')
            .select('translation_id')
            .eq('user_id', user.id);
          if (votes) {
            votedIds = new Set(votes.map(v => v.translation_id));
          }
        }

        setTranslations(data.map(row => ({
          id: row.id,
          songId: row.song_id,
          userId: row.user_id,
          userName: row.user_name,
          lines: row.lines as { lineId: number; english: string }[],
          upvotes: row.upvotes,
          hasVoted: votedIds.has(row.id),
          createdAt: row.created_at,
        })));
      }
      setLoading(false);
    };

    fetchTranslations();
  }, [songId, user]);

  const submitTranslation = useCallback(async (lines: { lineId: number; english: string }[], userName: string) => {
    if (!user || !songId) return;

    const { data, error } = await supabase
      .from('artistic_translations')
      .insert({
        song_id: songId,
        user_id: user.id,
        user_name: userName,
        lines,
      })
      .select()
      .single();

    if (!error && data) {
      setTranslations(prev => [{
        id: data.id,
        songId: data.song_id,
        userId: data.user_id,
        userName: data.user_name,
        lines: data.lines as { lineId: number; english: string }[],
        upvotes: 0,
        hasVoted: false,
        createdAt: data.created_at,
      }, ...prev]);
    }
  }, [user, songId]);

  const toggleVote = useCallback(async (translationId: string) => {
    if (!user) return;

    const translation = translations.find(t => t.id === translationId);
    if (!translation) return;

    if (translation.hasVoted) {
      // Remove vote
      await supabase
        .from('translation_votes')
        .delete()
        .eq('translation_id', translationId)
        .eq('user_id', user.id);

      await supabase
        .from('artistic_translations')
        .update({ upvotes: Math.max(0, translation.upvotes - 1) })
        .eq('id', translationId);

      setTranslations(prev => prev.map(t =>
        t.id === translationId ? { ...t, upvotes: t.upvotes - 1, hasVoted: false } : t
      ));
    } else {
      // Add vote
      await supabase
        .from('translation_votes')
        .insert({ translation_id: translationId, user_id: user.id });

      await supabase
        .from('artistic_translations')
        .update({ upvotes: translation.upvotes + 1 })
        .eq('id', translationId);

      setTranslations(prev => prev.map(t =>
        t.id === translationId ? { ...t, upvotes: t.upvotes + 1, hasVoted: true } : t
      ));
    }
  }, [user, translations]);

  const deleteTranslation = useCallback(async (translationId: string) => {
    if (!user) return;
    const { error } = await supabase.from('artistic_translations').delete().eq('id', translationId);
    if (error) {
      console.error('Failed to delete translation:', error.message);
      return;
    }
    setTranslations(prev => prev.filter(t => t.id !== translationId));
    if (selectedTranslationId === translationId) setSelectedTranslationId(null);
  }, [user, selectedTranslationId]);

  // Get english overrides for the selected translation
  const selectedTranslation = translations.find(t => t.id === selectedTranslationId) || null;
  const englishOverrides = selectedTranslation
    ? new Map(selectedTranslation.lines.map(l => [l.lineId, l.english]))
    : null;

  return {
    translations,
    selectedTranslationId,
    setSelectedTranslationId,
    selectedTranslation,
    englishOverrides,
    submitTranslation,
    toggleVote,
    deleteTranslation,
    loading,
  };
}
