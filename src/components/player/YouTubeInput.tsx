import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { isValidYouTubeUrl } from '../../lib/videoId';

interface YouTubeInputProps {
  onSubmit: (url: string) => void;
  loading?: boolean;
  defaultUrl?: string;
}

export default function YouTubeInput({ onSubmit, loading, defaultUrl = '' }: YouTubeInputProps) {
  const [url, setUrl] = useState(defaultUrl);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setValidationError('Please enter a YouTube URL');
      return;
    }
    if (!isValidYouTubeUrl(url)) {
      setValidationError('Please enter a valid YouTube URL');
      return;
    }
    setValidationError('');
    onSubmit(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setValidationError('');
            }}
            placeholder="Paste a YouTube URL to learn Chinese..."
            className="w-full rounded-xl border border-white/10 bg-bg-secondary px-4 py-3 pl-11 text-text-primary placeholder-text-secondary outline-none transition-colors focus:border-china-red"
            disabled={loading}
          />
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-china-red px-6 py-3 font-medium text-white transition-colors hover:bg-china-red-dark disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            'Learn'
          )}
        </button>
      </div>
      {validationError && (
        <p className="mt-2 text-sm text-china-red">{validationError}</p>
      )}
    </form>
  );
}
