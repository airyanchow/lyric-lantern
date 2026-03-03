import { useEffect, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SongCard from './SongCard';

interface TopSong {
  id: string;
  video_id: string;
  title: string;
  artist: string;
  thumbnail_url: string;
  view_count: number;
  youtube_url: string;
}

interface TopSongsListProps {
  onSongSelect: (url: string) => void;
}

export default function TopSongsList({ onSongSelect }: TopSongsListProps) {
  const [songs, setSongs] = useState<TopSong[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopSongs() {
      try {
        const { data } = await supabase
          .from('songs')
          .select('id, video_id, title, artist, thumbnail_url, view_count, youtube_url')
          .order('view_count', { ascending: false })
          .limit(100);

        setSongs(data || []);
      } catch {
        console.warn('Could not fetch top songs (Supabase may not be configured)');
      }
      setLoading(false);
    }

    fetchTopSongs();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-china-red" />
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <TrendingUp className="h-12 w-12 text-text-secondary/30" />
        <h3 className="mt-4 text-lg font-medium text-text-primary">No songs yet</h3>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">
          Be the first! Paste a YouTube URL on the home page to add a song.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {songs.map((song, index) => (
        <SongCard
          key={song.id}
          rank={index + 1}
          title={song.title}
          artist={song.artist}
          thumbnailUrl={song.thumbnail_url}
          viewCount={song.view_count}
          onClick={() => onSongSelect(song.youtube_url)}
        />
      ))}
    </div>
  );
}
