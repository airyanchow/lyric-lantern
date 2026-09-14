import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RecommendedSongsProps {
  currentSongId: string;
  currentArtist: string;
  onSongSelect: (url: string) => void;
}

interface RecSong {
  id: string;
  title: string;
  artist: string;
  thumbnail_url: string;
  youtube_url: string;
}

export default function RecommendedSongs({ currentSongId, currentArtist, onSongSelect }: RecommendedSongsProps) {
  const [songs, setSongs] = useState<RecSong[]>([]);

  useEffect(() => {
    const fetchRecs = async () => {
      // Try same artist first
      const normalized = currentArtist.toLowerCase().trim();
      const { data } = await supabase
        .from('songs')
        .select('id, title, artist, thumbnail_url, youtube_url')
        .eq('is_published', true)
        .ilike('artist', `%${normalized}%`)
        .neq('id', currentSongId)
        .limit(4);

      if (data && data.length >= 2) {
        setSongs(data);
        return;
      }

      // Fallback: popular songs
      const { data: popular } = await supabase
        .from('songs')
        .select('id, title, artist, thumbnail_url, youtube_url')
        .eq('is_published', true)
        .neq('id', currentSongId)
        .order('view_count', { ascending: false })
        .limit(4);

      setSongs(popular || []);
    };

    fetchRecs();
  }, [currentSongId, currentArtist]);

  if (songs.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="mb-3 text-sm font-semibold text-text-secondary">You might also like</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {songs.map(s => (
          <button
            key={s.id}
            onClick={() => onSongSelect(s.youtube_url)}
            className="group overflow-hidden rounded-xl border border-white/5 bg-bg-card text-left transition-all hover:border-white/10"
          >
            <div className="relative aspect-video w-full bg-bg-secondary">
              {s.thumbnail_url && <img src={s.thumbnail_url} alt={s.title} className="h-full w-full object-cover" />}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Play className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="p-2">
              <p className="truncate text-xs font-medium text-text-primary">{s.title}</p>
              <p className="truncate text-[10px] text-text-secondary">{s.artist}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
