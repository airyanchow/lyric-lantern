import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TrendingUp, Search, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SongCard from '../components/songs/SongCard';

interface BrowseSong {
  id: string;
  title: string;
  artist: string;
  thumbnail_url: string;
  view_count: number;
  youtube_url: string;
  hsk_level: number | null;
}

type SortOption = 'popular' | 'recent' | 'az';

export default function BrowsePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [songs, setSongs] = useState<BrowseSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [artistFilter, setArtistFilter] = useState(searchParams.get('artist') || '');
  const [sort, setSort] = useState<SortOption>('popular');

  useEffect(() => {
    supabase
      .from('songs')
      .select('id, title, artist, thumbnail_url, view_count, youtube_url, hsk_level')
      .eq('is_published', true)
      .order('view_count', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setSongs(data || []);
        setLoading(false);
      });
  }, []);

  // Apply from URL params
  useEffect(() => {
    const a = searchParams.get('artist');
    if (a) setArtistFilter(a);
    const q = searchParams.get('q');
    if (q) setSearchQuery(q);
  }, [searchParams]);

  const filtered = useMemo(() => {
    let result = songs;

    // Artist filter
    if (artistFilter) {
      const norm = artistFilter.toLowerCase();
      result = result.filter(s => s.artist.toLowerCase().includes(norm));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sort === 'recent') {
      result = [...result].reverse();
    } else if (sort === 'az') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [songs, searchQuery, artistFilter, sort]);

  const handleSongSelect = (url: string) => {
    navigate('/', { state: { songUrl: url } });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setArtistFilter('');
    setSearchParams({});
  };

  const hasFilters = searchQuery || artistFilter;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 text-center">
        <TrendingUp className="mx-auto h-10 w-10 text-china-red" />
        <h1 className="mt-4 text-2xl font-bold">
          {artistFilter ? `Songs by ${artistFilter}` : 'Browse Songs'}
        </h1>
        <p className="mt-2 text-text-secondary">
          {filtered.length} song{filtered.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Search + Sort bar */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search songs or artists..."
            className="w-full rounded-xl border border-white/10 bg-bg-secondary py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder-text-secondary/50 outline-none focus:border-china-red/50"
          />
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortOption)}
          className="rounded-xl border border-white/10 bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none"
        >
          <option value="popular">Popular</option>
          <option value="recent">Recent</option>
          <option value="az">A-Z</option>
        </select>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {artistFilter && (
            <span className="inline-flex items-center gap-1 rounded-full bg-china-red/10 px-3 py-1 text-xs text-china-red-light">
              Artist: {artistFilter}
              <button onClick={() => { setArtistFilter(''); setSearchParams({}); }}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button onClick={clearFilters} className="text-xs text-text-secondary hover:text-text-primary">
            Clear all
          </button>
        </div>
      )}

      {/* Song list */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-china-red border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-text-secondary">
          No songs found. Try a different search.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((song, index) => (
            <SongCard
              key={song.id}
              rank={index + 1}
              title={song.title}
              artist={song.artist}
              thumbnailUrl={song.thumbnail_url}
              viewCount={song.view_count}
              onClick={() => handleSongSelect(song.youtube_url)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
