import { memo } from 'react';
import type { LyricLine as LyricLineType, LyricWord } from '../../types';

interface LyricLineProps {
  line: LyricLineType;
  isActive: boolean;
  onClick: () => void;
  onWordClick: (word: LyricWord, event: React.MouseEvent) => void;
  lineRef: React.Ref<HTMLDivElement>;
}

function LyricLineComponent({ line, isActive, onClick, onWordClick, lineRef }: LyricLineProps) {
  return (
    <div
      ref={lineRef}
      onClick={onClick}
      className={`cursor-pointer rounded-xl px-4 py-3 transition-all duration-300 ${
        isActive
          ? 'scale-[1.02] border-l-4 border-china-red bg-white/5'
          : 'border-l-4 border-transparent opacity-50 hover:opacity-75 hover:bg-white/[0.02]'
      }`}
    >
      {/* Pinyin */}
      <p className={`mb-1 text-sm tracking-wider transition-colors duration-300 ${
        isActive ? 'text-text-pinyin' : 'text-text-pinyin/60'
      }`}>
        {line.pinyin}
      </p>

      {/* Chinese Characters - clickable words */}
      <p className={`mb-1.5 font-chinese text-2xl font-medium leading-relaxed tracking-wide transition-all duration-300 md:text-3xl ${
        isActive ? 'text-text-primary' : 'text-text-primary/70'
      }`}>
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
      <p className={`text-sm transition-colors duration-300 ${
        isActive ? 'text-text-secondary' : 'text-text-secondary/50'
      }`}>
        {line.english}
      </p>
    </div>
  );
}

export default memo(LyricLineComponent);
