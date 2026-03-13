import { memo } from 'react';
import type { LyricLine as LyricLineType, LyricWord } from '../../types';

interface LyricLineProps {
  line: LyricLineType;
  onWordClick: (word: LyricWord, event: React.MouseEvent) => void;
}

function LyricLineComponent({ line, onWordClick }: LyricLineProps) {
  return (
    <div className="rounded-xl px-4 py-3 hover:bg-white/[0.02]">
      {/* Pinyin */}
      <p className="mb-1 text-sm tracking-wider text-text-pinyin">
        {line.pinyin}
      </p>

      {/* Chinese Characters - clickable words */}
      <p className="mb-1.5 font-chinese text-2xl font-medium leading-relaxed tracking-wide text-text-primary md:text-3xl">
        {line.words.map((word, idx) => (
          <span
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              onWordClick(word, e);
            }}
            className="inline-block cursor-pointer rounded px-0.5 transition-colors hover:bg-china-red/20 hover:text-china-red-light"
          >
            {word.chinese}
          </span>
        ))}
      </p>

      {/* English Translation */}
      <p className="text-sm text-text-secondary">
        {line.english}
      </p>
    </div>
  );
}

export default memo(LyricLineComponent);
