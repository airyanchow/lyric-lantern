import { useState } from 'react';
import { X, Flag } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const REASONS = ['Inappropriate', 'Spam', 'Incorrect', 'Other'];

export default function ReportModal({ isOpen, onClose, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const full = details.trim() ? `${reason}: ${details.trim()}` : reason;
    if (!full) return;
    onSubmit(full);
    setReason('');
    setDetails('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Report content">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Flag className="h-5 w-5 text-orange-400" /> Report Content
          </h3>
          <button onClick={onClose} className="rounded p-1 text-text-secondary hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-2">
          {REASONS.map(r => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                reason === r ? 'border-china-red bg-china-red/10 text-china-red-light' : 'border-white/10 text-text-primary hover:bg-white/5'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <textarea
          value={details}
          onChange={e => setDetails(e.target.value)}
          placeholder="Additional details (optional)"
          className="mt-3 w-full rounded-lg border border-white/10 bg-bg-secondary p-2 text-sm text-text-primary placeholder-text-secondary/50 outline-none focus:border-china-red/50"
          rows={2}
        />

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-white/10">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!reason}
            className="rounded-lg bg-china-red px-4 py-2 text-sm font-medium text-white hover:bg-china-red-dark disabled:opacity-50"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
