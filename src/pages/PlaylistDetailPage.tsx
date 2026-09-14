import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Play, Plus, Search } from 'lucide-react';
import { usePlaylists, type PlaylistSong } from '../hooks/usePlaylists';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playlists, fetchPlaylistSongs, addSongToPlaylist, deletePlaylist } = usePlaylists();
  const [songs, setSongs] = useState<PlaylistSong[]>([]);
  const [playlistInfo, setPlaylistInfo] = useState<{ name: string; description: string; userId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showAddSong, setShowAddSong] = useState(true);

  useEffect(() => {
    if (!id) return;

    // Check local playlists first
    const local = playlists.find(p => p.id === id);
    if (local) {
      setPlaylistInfo({ name: local.name, description: local.description, userId: local.userId });
    } else {
      // Fetch from DB
      supabase.from('playlists').select('name, description, user_id').eq('id', id).single()
        .then(({ data }) => {
          if (data) setPlaylistInfo({ name: data.name, description: data.description || '', userId: data.user_id });
        });
    }

    fetchPlaylistSongs(id).then(s => {
      setSongs(s);
      setLoading(false);
    });
  }, [id, playlists, fetchPlaylistSongs]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    const { data } = await supabase
      .from('songs')
      .select('id, title, artist, thumbnail_url')
      .eq('is_published', true)
      .or(`title.ilike.%${searchQuery}%,artist.ilike.%${searchQuery}%`)
      .limit(10);
    setSearchResults(data || []);
  }, [searchQuery]);

  const handleAddSong = async (songId: string) => {
    if (!id) return;
    await addSongToPlaylist(id, songId);
    const updated = await fetchPlaylistSongs(id);
    setSongs(updated);
    setSearchResults(prev => prev.filter(s => s.id !== songId));
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Delete this playlist? This cannot be undone.')) return;
    await deletePlaylist(id);
    navigate('/playlists');
  };

  const isOwner = user && playlistInfo?.userId === user.id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <button onClick={() => navigate('/playlists')} className="mb-4 flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to Playlists
      </button>

      {playlistInfo && (
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{playlistInfo.name}</h1>
            {playlistInfo.description && <p className="mt-1 text-sm text-text-secondary">{playlistInfo.description}</p>}
            <p className="mt-1 text-xs text-text-secondary">{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
          </div>
          {isOwner && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddSong(!showAddSong)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-china-red/10 px-3 py-1.5 text-sm text-china-red-light hover:bg-china-red/20"
              >
                <Plus className={`h-4 w-4 transition-transform ${showAddSong ? 'rotate-45' : ''}`} /> {showAddSong ? 'Close' : 'Add Song'}
              </button>
              <button onClick={handleDelete} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add song search */}
      {showAddSong && (
        <div className="mb-6 rounded-xl border border-white/10 bg-bg-card p-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search songs by title or artist..."
              className="flex-1 rounded-lg border border-white/10 bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 outline-none focus:border-china-red/50"
            />
            <button onClick={handleSearch} className="rounded-lg bg-china-red px-3 py-2 text-sm text-white hover:bg-china-red-dark">
              <Search className="h-4 w-4" />
            </button>
          </div>
          {searchResults.map(s => (
            <div key={s.id} className="flex items-center justify-between rounded-lg bg-bg-secondary/50 p-2">
              <div className="flex items-center gap-3">
                {s.thumbnail_url && <img src={s.thumbnail_url} alt="" className="h-8 w-12 rounded object-cover" />}
                <div>
                  <p className="text-sm font-medium text-text-primary">{s.title}</p>
                  <p className="text-xs text-text-secondary">{s.artist}</p>
                </div>
              </div>
              <button onClick={() => handleAddSong(s.id)} className="rounded bg-china-red/10 px-2 py-1 text-xs text-china-red-light hover:bg-china-red/20">
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Song list */}
      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-text-pinyin border-t-transparent" /></div>
      ) : songs.length === 0 ? (
        <div className="py-12 text-center text-text-secondary">No songs in this playlist yet.</div>
      ) : (
        <div className="space-y-2">
          {songs.map((s, i) => (
            <button
              key={s.id}
              onClick={() => navigate('/', { state: { songUrl: `https://www.youtube.com/watch?v=${s.videoId}` } })}
              className="flex w-full items-center gap-3 rounded-xl border border-white/5 bg-bg-card p-3 text-left transition-all hover:border-white/10"
            >
              <span className="w-6 text-center text-sm text-text-secondary">{i + 1}</span>
              {s.thumbnailUrl && <img src={s.thumbnailUrl} alt="" className="h-10 w-16 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">{s.title}</p>
                <p className="truncate text-xs text-text-secondary">{s.artist}</p>
              </div>
              <Play className="h-4 w-4 text-text-secondary" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
