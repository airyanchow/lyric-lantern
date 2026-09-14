import { memo } from 'react';

interface FlashCardProps {
  chinese: string;
  pinyin: string;
  english: string;
  flipped: boolean;
  onFlip: () => void;
}

function FlashCardComponent({ chinese, pinyin, english, flipped, onFlip }: FlashCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={flipped ? `English: ${english}. Tap to see Chinese.` : `Chinese: ${chinese}, ${pinyin}. Tap to see English.`}
      className="perspective-[800px] mx-auto h-72 w-full max-w-sm cursor-pointer"
      onClick={onFlip}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onFlip(); } }}
    >
      <div
        className={`relative h-full w-full [transform-style:preserve-3d] ${
          flipped ? 'card-flip-forward' : 'card-flip-backward'
        }`}
      >
        {/* Front */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-bg-card p-6 shadow-lg [backface-visibility:hidden]">
          <p className="font-chinese text-5xl font-medium text-text-primary">{chinese}</p>
          <p className="mt-4 text-xl text-text-pinyin">{pinyin}</p>
          <p className="mt-6 text-xs text-text-secondary">Tap to flip</p>
        </div>

        {/* Back */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-bg-card p-6 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="text-center text-2xl font-medium text-text-primary">{english}</p>
          <p className="mt-6 text-xs text-text-secondary">Tap to flip back</p>
        </div>
      </div>
    </div>
  );
}

export default memo(FlashCardComponent);
