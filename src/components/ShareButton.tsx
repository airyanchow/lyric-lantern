import { useState, useCallback } from 'react';
import { Share2, Check } from 'lucide-react';

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
}

export default function ShareButton({ url, title, text }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {}
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: prompt user to copy manually
      window.prompt('Copy this link:', url);
    }
  }, [url, title, text]);

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-text-secondary transition-colors hover:border-china-red/30 hover:text-text-primary"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Share2 className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
