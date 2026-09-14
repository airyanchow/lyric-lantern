import { useEffect, useState } from 'react';
import { Loader2, Music2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SongCard from './SongCard';

interface ChartSong {
  id: string;
  video_id: string;
  youtube_url: string;
  title: string;
  artist: string;
  thumbnail_url: string;
  year: number;
  rank: number;
  view_count: number;
}

interface MandarinChartListProps {
  year: number;
  onSongSelect: (url: string) => void;
}

export default function MandarinChartList({ year, onSongSelect }: MandarinChartListProps) {
  const [songs, setSongs] = useState<ChartSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Guard against a race: clicking through years quickly can land an older
    // response after a newer one. Ignore anything that resolves after unmount
    // or after `year` has moved on.
    let cancelled = false;

    setLoading(true);
    setFailed(false);

    (async () => {
      const { data, error } = await supabase
        .from('mandarin_charts')
        .select('id, video_id, youtube_url, title, artist, thumbnail_url, year, rank, view_count')
        .eq('year', year)
        .order('rank', { ascending: true });

      if (cancelled) return;

      if (error) {
        console.warn('Could not load the chart for', year, error.message);
        setFailed(true);
        setSongs([]);
      } else {
        setSongs((data ?? []) as ChartSong[]);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [year]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-china-red" />
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
        <p className="text-text-secondary">Could not load the chart just now.</p>
        <p className="mt-1 text-sm text-text-secondary">Please try again in a moment.</p>
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
        <Music2 className="h-12 w-12 text-text-secondary/30" />
        <h3 className="mt-4 text-lg font-medium text-text-primary">Nothing for {year} yet</h3>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">
          This year hasn&apos;t been filled in. Run the chart script to add it:
        </p>
        <pre className="mt-3 rounded-lg bg-bg-secondary px-4 py-2 text-xs text-text-secondary">
          npm run seed:charts -- --years={year}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {songs.map((song) => (
        <SongCard
          key={song.id}
          rank={song.rank}
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
