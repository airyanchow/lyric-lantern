import type { SavedWord } from '../types';

/** Generate Anki-compatible TSV content and trigger download */
export function exportToAnki(words: SavedWord[], filename: string = 'lyric-lantern-vocabulary') {
  const header = '#separator:tab\n#html:false\n#columns:Chinese\tPinyin\tEnglish\tSong\n';
  const rows = words.map(w =>
    `${w.chinese}\t${w.pinyin}\t${w.english}\t${w.song_title || ''}`
  ).join('\n');

  const content = header + rows;
  const blob = new Blob([content], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
