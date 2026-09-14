import { Flag, Trash2 } from 'lucide-react';

interface NoteCardProps {
  note: {
    id: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: string;
  };
  currentUserId?: string;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
}

export default function NoteCard({ note, currentUserId, onDelete, onReport }: NoteCardProps) {
  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="rounded-lg border border-white/5 bg-bg-secondary/50 p-3">
      <p className="text-sm text-text-primary">{note.content}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          {note.userName} &middot; {timeAgo(note.createdAt)}
        </span>
        <div className="flex gap-1">
          {currentUserId === note.userId ? (
            <button onClick={() => onDelete(note.id)} aria-label="Delete note" className="rounded p-1 text-text-secondary hover:bg-white/10 hover:text-red-400">
              <Trash2 className="h-3 w-3" />
            </button>
          ) : (
            <button onClick={() => onReport(note.id)} aria-label="Report note" className="rounded p-1 text-text-secondary hover:bg-white/10 hover:text-orange-400">
              <Flag className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
