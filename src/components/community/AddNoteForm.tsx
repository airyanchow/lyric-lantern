import { useState } from 'react';
import { Send } from 'lucide-react';

interface AddNoteFormProps {
  onSubmit: (content: string) => void;
}

export default function AddNoteForm({ onSubmit }: AddNoteFormProps) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText('');
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-1.5">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Add a note about this line..."
          maxLength={500}
          aria-label="Add a note"
          className="flex-1 rounded-lg border border-white/10 bg-bg-secondary px-2.5 py-1.5 text-xs text-text-primary placeholder-text-secondary/50 outline-none focus:border-china-red/50"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          aria-label="Submit note"
          className="rounded-lg bg-china-red/10 px-2.5 py-1.5 text-china-red-light hover:bg-china-red/20 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
      {text.length > 400 && (
        <p className="text-right text-[10px] text-text-secondary">{text.length}/500</p>
      )}
    </div>
  );
}
