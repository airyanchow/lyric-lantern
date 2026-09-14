import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { supabase } from '../lib/supabase';
import { Check, X, Eye, Loader2, ShieldAlert } from 'lucide-react';

interface LyricsCorrection {
  id: string;
  song_id: string;
  video_id: string;
  submitted_by_name: string;
  mode: string;
  raw_text: string;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
  songs?: { title: string; artist: string; thumbnail_url: string };
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [corrections, setCorrections] = useState<LyricsCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchCorrections = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('lyrics_corrections')
      .select('*, songs(title, artist, thumbnail_url)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    setCorrections((data as LyricsCorrection[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    if (isAdmin) fetchCorrections();
  }, [isAdmin, fetchCorrections]);

  const handleApprove = useCallback(async (correction: LyricsCorrection) => {
    setActionLoading(correction.id);
    try {
      // Process the raw lyrics through the edge function to get translated/structured lyrics
      const youtubeUrl = `https://www.youtube.com/watch?v=${correction.video_id}`;
      const response = await supabase.functions.invoke('process-song', {
        body: {
          videoId: correction.video_id,
          youtubeUrl,
          userLyrics: correction.raw_text,
          userLyricsMode: correction.mode,
        },
      });

      if (response.error) throw new Error(response.error.message);
      const processedData = response.data;
      if (!processedData?.lyrics || !Array.isArray(processedData.lyrics)) {
        throw new Error('Edge function did not return valid lyrics');
      }

      // Now approve with the processed lyrics
      const { error } = await supabase.rpc('approve_lyrics_correction', {
        p_correction_id: correction.id,
        p_processed_lyrics: processedData.lyrics,
        p_reviewer_notes: reviewNotes || null,
      });
      if (error) throw error;

      setReviewNotes('');
      fetchCorrections();
    } catch (err: any) {
      alert('Error approving: ' + (err?.message || 'Unknown error'));
    }
    setActionLoading(null);
  }, [reviewNotes, fetchCorrections]);

  const handleReject = useCallback(async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase.rpc('reject_lyrics_correction', {
      p_correction_id: id,
      p_reviewer_notes: reviewNotes || null,
    });
    if (error) {
      alert('Error rejecting: ' + error.message);
    } else {
      setReviewNotes('');
      fetchCorrections();
    }
    setActionLoading(null);
  }, [reviewNotes, fetchCorrections]);

  if (authLoading || adminLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-china-red" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <ShieldAlert className="h-16 w-16 text-china-red/60" />
        <h1 className="mt-4 text-2xl font-bold">Admin Access Required</h1>
        <p className="mt-2 text-text-secondary">
          {!user ? 'Please sign in with an admin account.' : 'Your account does not have admin privileges.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Lyrics Corrections</h1>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-bg-card p-1">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium capitalize transition-colors ${
              filter === f ? 'bg-china-red text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
        </div>
      ) : corrections.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-bg-card p-8 text-center text-text-secondary">
          No {filter === 'all' ? '' : filter} corrections found.
        </div>
      ) : (
        <div className="space-y-4">
          {corrections.map((c) => (
            <div key={c.id} className="rounded-xl border border-white/10 bg-bg-card p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {c.songs?.thumbnail_url && (
                    <img src={c.songs.thumbnail_url} alt="" className="h-12 w-16 rounded object-cover" />
                  )}
                  <div>
                    <h3 className="font-medium text-text-primary">{c.songs?.title || c.video_id}</h3>
                    <p className="text-sm text-text-secondary">{c.songs?.artist || 'Unknown Artist'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    c.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {c.status}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {c.mode === 'pretranslated' ? 'Pre-translated' : 'Chinese Only'}
                  </span>
                </div>
              </div>

              {/* Metadata */}
              <div className="mt-3 flex gap-4 text-xs text-text-secondary">
                <span>By: {c.submitted_by_name}</span>
                <span>{new Date(c.created_at).toLocaleString()}</span>
              </div>

              {/* Preview toggle */}
              <button
                onClick={() => setPreviewId(previewId === c.id ? null : c.id)}
                className="mt-3 flex items-center gap-1 text-xs text-china-red hover:text-china-red-light"
              >
                <Eye className="h-3.5 w-3.5" />
                {previewId === c.id ? 'Hide' : 'Preview'} submitted lyrics
              </button>

              {/* Preview content */}
              {previewId === c.id && (
                <pre className="mt-3 max-h-60 overflow-auto rounded-lg bg-bg-primary p-3 font-chinese text-sm text-text-primary">
                  {c.raw_text}
                </pre>
              )}

              {/* Reviewer notes */}
              {c.reviewer_notes && (
                <p className="mt-2 text-xs text-text-secondary italic">
                  Review note: {c.reviewer_notes}
                </p>
              )}

              {/* Actions for pending */}
              {c.status === 'pending' && (
                <div className="mt-4 space-y-3 border-t border-white/5 pt-3">
                  <input
                    type="text"
                    placeholder="Optional review notes..."
                    value={actionLoading === c.id ? reviewNotes : ''}
                    onChange={(e) => { setReviewNotes(e.target.value); setActionLoading(null); }}
                    onFocus={() => setReviewNotes('')}
                    className="w-full rounded-lg border border-white/10 bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-china-red focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(c)}
                      disabled={actionLoading === c.id}
                      className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Approve & Apply
                    </button>
                    <button
                      onClick={() => handleReject(c.id)}
                      disabled={actionLoading === c.id}
                      className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
