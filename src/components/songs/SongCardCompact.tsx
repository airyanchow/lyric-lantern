import { Play } from 'lucide-react';

interface SongCardCompactProps {
  title: string;
  artist: string;
  thumbnailUrl?: string;
  onClick: () => void;
}

export default function SongCardCompact({ title, artist, thumbnailUrl, onClick }: SongCardCompactProps) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full flex-col overflow-hidden rounded-xl border border-white/5 bg-bg-card transition-all hover:border-white/10 hover:bg-bg-card/80"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-bg-secondary">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Play className="h-6 w-6 text-text-secondary" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-8 w-8 text-white" />
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="truncate text-sm font-medium text-text-primary">{title || 'Unknown Song'}</p>
        <p className="truncate text-xs text-text-secondary">{artist || 'Unknown Artist'}</p>
      </div>
    </button>
  );
}
