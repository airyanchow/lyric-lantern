import { memo } from 'react';
import type { LyricLine as LyricLineType, LyricWord } from '../../types';

interface LyricLineProps {
  line: LyricLineType;
  onWordClick: (word: LyricWord, event: React.MouseEvent) => void;
  showPinyin?: boolean;
  englishOverride?: string;
  hskColorMap?: Map<string, number>;
  noteCount?: number;
}

const HSK_COLORS: Record<number, string> = {
  1: 'hover:bg-emerald-500/20 hover:text-emerald-300',
  2: 'hover:bg-sky-500/20 hover:text-sky-300',
  3: 'hover:bg-indigo-500/20 hover:text-indigo-300',
  4: 'hover:bg-amber-500/20 hover:text-amber-300',
  5: 'hover:bg-orange-500/20 hover:text-orange-300',
  6: 'hover:bg-rose-500/20 hover:text-rose-300',
};

const HSK_BG: Record<number, string> = {
  1: 'bg-emerald-500/10 text-emerald-300',
  2: 'bg-sky-500/10 text-sky-300',
  3: 'bg-indigo-500/10 text-indigo-300',
  4: 'bg-amber-500/10 text-amber-300',
  5: 'bg-orange-500/10 text-orange-300',
  6: 'bg-rose-500/10 text-rose-300',
};

function LyricLineComponent({ line, onWordClick, showPinyin = true, englishOverride, hskColorMap }: LyricLineProps) {
  const hasWords = line.words && line.words.length > 0;

  const getWordHoverClass = (chinese: string) => {
    if (!hskColorMap) return 'hover:bg-china-red/20 hover:text-china-red-light';
    const level = hskColorMap.get(chinese);
    return level ? HSK_COLORS[level] : 'hover:bg-gray-500/20 hover:text-gray-300';
  };

  const getWordBgClass = (chinese: string) => {
    if (!hskColorMap) return '';
    const level = hskColorMap.get(chinese);
    return level ? HSK_BG[level] : '';
  };

  // If a word is missing pinyin/english, try to extract from the line-level data
  // For single-word lines, the line pinyin/english IS the word's pinyin/english
  const enrichWord = (word: LyricWord): LyricWord => {
    const hasPinyin = word.pinyin && word.pinyin.trim().length > 0;
    const hasEnglish = word.english && word.english.trim().length > 0;

    if (hasPinyin && hasEnglish) return word;

    // If this is the only word on the line, use line-level data
    const isSoleWord = line.words.length === 1;

    return {
      chinese: word.chinese,
      pinyin: hasPinyin ? word.pinyin : (isSoleWord ? line.pinyin : word.pinyin),
      english: hasEnglish ? word.english : (isSoleWord ? line.english : word.english),
    };
  };

  return (
    <div className="rounded-xl px-4 py-3 hover:bg-white/[0.02]">
      {/* Pinyin */}
      {showPinyin && (
        <p className="mb-1 text-sm tracking-wider text-text-pinyin">
          {line.pinyin}
        </p>
      )}

      {/* Chinese Characters - clickable words */}
      <p className="mb-1.5 font-chinese text-2xl font-medium leading-relaxed tracking-wide text-text-primary md:text-3xl">
        {hasWords ? (
          line.words.map((word, idx) => (
            <span
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                onWordClick(enrichWord(word), e);
              }}
              className={`inline-block cursor-pointer rounded px-0.5 transition-colors ${getWordHoverClass(word.chinese)} ${getWordBgClass(word.chinese)}`}
            >
              {word.chinese}
            </span>
          ))
        ) : (
          /* Fallback for pre-translated lyrics without word segmentation */
          <span
            onClick={(e) => {
              e.stopPropagation();
              onWordClick(
                { chinese: line.chinese, pinyin: line.pinyin, english: line.english },
                e
              );
            }}
            className="inline-block cursor-pointer rounded px-0.5 transition-colors hover:bg-china-red/20 hover:text-china-red-light"
          >
            {line.chinese}
          </span>
        )}
      </p>

      {/* English Translation */}
      <p className="text-sm text-text-secondary">
        {englishOverride || line.english}
      </p>
    </div>
  );
}

export default memo(LyricLineComponent);
