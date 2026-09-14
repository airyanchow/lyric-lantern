import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListMusic, Plus, X, Globe, Lock, Music } from 'lucide-react';
import { usePlaylists } from '../hooks/usePlaylists';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import type { Playlist } from '../hooks/usePlaylists';

export default function PlaylistsPage() {
  const { user } = useAuth();
  const { playlists, createPlaylist, loading } = usePlaylists();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [publicPlaylists, setPublicPlaylists] = useState<Playlist[]>([]);

  // Fetch public playlists from others
  useEffect(() => {
    supabase
      .from('playlists')
      .select('*, playlist_songs(count)')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setPublicPlaylists(data
            .filter((p: any) => !user || p.user_id !== user.id)
            .map((row: any) => ({
              id: row.id,
              userId: row.user_id,
              name: row.name,
              description: row.description || '',
              isPublic: row.is_public,
              songCount: row.playlist_songs?.[0]?.count || 0,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            }))
          );
        }
      });
  }, [user]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const pl = await createPlaylist(name.trim(), description.trim(), isPublic);
    if (pl) {
      setShowForm(false);
      setName('');
      setDescription('');
      navigate(`/playlists/${pl.id}`);
    }
  };

  const PlaylistCard = ({ playlist }: { playlist: Playlist }) => (
    <button
      onClick={() => navigate(`/playlists/${playlist.id}`)}
      className="flex items-center gap-4 rounded-xl border border-white/5 bg-bg-card p-4 text-left transition-all hover:border-white/10"
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-china-red/10">
        <Music className="h-6 w-6 text-china-red" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text-primary">{playlist.name}</p>
        <p className="text-xs text-text-secondary">
          {playlist.songCount} song{playlist.songCount !== 1 ? 's' : ''} &middot;{' '}
          {playlist.isPublic ? 'Public' : 'Private'}
        </p>
      </div>
    </button>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListMusic className="h-8 w-8 text-china-red" />
          <h1 className="text-2xl font-bold">Playlists</h1>
        </div>
        {user && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-china-red px-4 py-2 text-sm font-medium text-white hover:bg-china-red-dark"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'New Playlist'}
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-white/10 bg-bg-card p-5 space-y-3">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Playlist name"
            className="w-full rounded-lg border border-white/10 bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 outline-none focus:border-china-red/50"
          />
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full rounded-lg border border-white/10 bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 outline-none focus:border-china-red/50"
          />
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPublic(true)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${isPublic ? 'bg-china-red/10 text-china-red-light' : 'text-text-secondary hover:bg-white/5'}`}
            >
              <Globe className="h-3.5 w-3.5" /> Public
            </button>
            <button
              onClick={() => setIsPublic(false)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${!isPublic ? 'bg-china-red/10 text-china-red-light' : 'text-text-secondary hover:bg-white/5'}`}
            >
              <Lock className="h-3.5 w-3.5" /> Private
            </button>
          </div>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="rounded-lg bg-china-red px-4 py-2 text-sm font-medium text-white hover:bg-china-red-dark disabled:opacity-50"
          >
            Create Playlist
          </button>
        </div>
      )}

      {/* My Playlists */}
      {user && playlists.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">My Playlists</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {playlists.map(p => <PlaylistCard key={p.id} playlist={p} />)}
          </div>
        </div>
      )}

      {/* Public Playlists */}
      {publicPlaylists.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Public Playlists</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {publicPlaylists.map(p => <PlaylistCard key={p.id} playlist={p} />)}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex h-32 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-pinyin border-t-transparent" />
        </div>
      )}
    </div>
  );
}
