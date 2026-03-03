import { Eye, Play } from 'lucide-react';

interface SongCardProps {
  rank: number;
  title: string;
  artist: string;
  thumbnailUrl?: string;
  viewCount: number;
  onClick: () => void;
}

function formatViews(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function SongCard({ rank, title, artist, thumbnailUrl, viewCount, onClick }: SongCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-xl border border-white/5 bg-bg-card p-3 text-left transition-all hover:border-white/10 hover:bg-bg-card/80"
    >
      {/* Rank */}
      <span className={`w-8 text-center text-lg font-bold ${
        rank <= 3 ? 'text-china-red' : 'text-text-secondary'
      }`}>
        {rank}
      </span>

      {/* Thumbnail */}
      <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-bg-secondary">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Play className="h-5 w-5 text-text-secondary" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text-primary">{title || 'Unknown Song'}</p>
        <p className="truncate text-sm text-text-secondary">{artist || 'Unknown Artist'}</p>
      </div>

      {/* Views */}
      <div className="flex items-center gap-1 text-sm text-text-secondary">
        <Eye className="h-3.5 w-3.5" />
        <span>{formatViews(viewCount)}</span>
      </div>
    </button>
  );
}
