import { useEffect, useState } from 'react';
import { Loader2, Award } from 'lucide-react';
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
  onSongSelect: (url: string) => void;
}

export default function MandarinChartList({ onSongSelect }: MandarinChartListProps) {
  const [songsByYear, setSongsByYear] = useState<Record<number, ChartSong[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChart() {
      try {
        const { data, error } = await supabase
          .from('mandarin_charts')
          .select('id, video_id, youtube_url, title, artist, thumbnail_url, year, rank, view_count')
          .order('year', { ascending: false })
          .order('rank', { ascending: true });

        if (error) throw error;

        // Group songs by year
        const grouped: Record<number, ChartSong[]> = {};
        for (const song of data ?? []) {
          if (!grouped[song.year]) grouped[song.year] = [];
          grouped[song.year].push(song as ChartSong);
        }
        setSongsByYear(grouped);
      } catch {
        console.warn('Could not fetch mandarin charts (Supabase may not be configured)');
      }
      setLoading(false);
    }

    fetchChart();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-china-red" />
      </div>
    );
  }

  const years = Object.keys(songsByYear)
    .map(Number)
    .sort((a, b) => b - a); // newest first

  if (years.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <Award className="h-12 w-12 text-text-secondary/30" />
        <h3 className="mt-4 text-lg font-medium text-text-primary">No chart data yet</h3>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">
          Run the discovery script to populate the Top 20 Mandarin Songs chart:
        </p>
        <pre className="mt-3 rounded-lg bg-bg-secondary px-4 py-2 text-xs text-text-secondary">
          npm run seed:charts
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {years.map((year) => (
        <section key={year}>
          {/* Year header */}
          <div className="mb-4 flex items-center gap-3">
            <span className="text-2xl font-bold text-text-primary">{year}</span>
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-text-secondary">
              {songsByYear[year].length} songs
            </span>
          </div>

          {/* Song list for this year */}
          <div className="space-y-2">
            {songsByYear[year].map((song) => (
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
        </section>
      ))}
    </div>
  );
}
