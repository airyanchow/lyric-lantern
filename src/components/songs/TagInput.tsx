import { useState } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { useTags } from '../../hooks/useTags';
import { useAuth } from '../../hooks/useAuth';

export default function TagInput({ songId }: { songId: string }) {
  const { user } = useAuth();
  const { songTagCounts, tags, addTag, removeTag, loading } = useTags(songId);
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (!input.trim()) return;
    addTag(input.trim());
    setInput('');
  };

  return (
    <div className="space-y-2">
      {/* Tags display */}
      <div className="flex flex-wrap gap-1.5">
        {songTagCounts.map(({ tag, count }) => {
          const userTag = tags.find(t => t.tag === tag && t.userId === user?.id);
          return (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-text-secondary"
            >
              <Tag className="h-3 w-3" />
              {tag} <span className="text-text-pinyin">({count})</span>
              {userTag && (
                <button onClick={() => removeTag(userTag.id)} className="ml-0.5 rounded-full p-0.5 hover:bg-white/10">
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          );
        })}
        {songTagCounts.length === 0 && !loading && (
          <span className="text-xs text-text-secondary">No tags yet</span>
        )}
      </div>

      {/* Add tag input */}
      {user && (
        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add a tag..."
            maxLength={30}
            className="flex-1 rounded-lg border border-white/10 bg-bg-secondary px-3 py-2 text-sm text-text-primary placeholder-text-secondary/50 outline-none focus:border-china-red/50"
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-china-red/10 text-china-red-light hover:bg-china-red/20 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
