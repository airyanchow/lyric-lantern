// A single word within a lyric line, clickable for vocabulary
export interface LyricWord {
  chinese: string;
  pinyin: string;
  english: string;
}

// A single line of lyrics with timing information
export interface LyricLine {
  id: number;
  startTime: number;
  endTime: number;
  chinese: string;
  pinyin: string;
  english: string;
  words: LyricWord[];
}

// A complete song with metadata and lyrics
export interface Song {
  id: string;
  video_id: string;
  title: string;
  titlePinyin?: string;
  titleEnglish?: string;
  artist: string;
  youtubeUrl: string;
  thumbnailUrl?: string;
  lyrics: LyricLine[];
  viewCount?: number;
}

// A vocabulary word saved by the user
export interface SavedWord {
  id: string;
  user_id: string;
  chinese: string;
  pinyin: string;
  english: string;
  song_title: string | null;
  created_at: string;
}

// Player state
export interface PlayerState {
  playing: boolean;
  playbackRate: number;
  playedSeconds: number;
  duration: number;
}
