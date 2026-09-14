import { useState, useCallback, useMemo } from 'react';
import LyricLine from './LyricLine';
import WordPopover from './WordPopover';
import TranslationSelector from './TranslationSelector';
import TagInput from '../songs/TagInput';
import ShareButton from '../ShareButton';
import NoteCard from '../community/NoteCard';
import AddNoteForm from '../community/AddNoteForm';
import ReportModal from '../community/ReportModal';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../contexts/SettingsContext';
import { useFavorites } from '../../hooks/useFavorites';
import { useCommunityNotes } from '../../hooks/useCommunityNotes';
import { supabase } from '../../lib/supabase';
import { buildHSKColorMap } from '../../utils/hskUtils';
import { Send, AlertTriangle, X, Check, Heart, Eye, EyeOff, Palette, MessageSquare } from 'lucide-react';
import type { LyricLine as LyricLineType, LyricWord } from '../../types';

interface LyricsPanelProps {
  lyrics: LyricLineType[];
  songTitle?: string;
  songId?: string;
  videoId?: string;
  artist?: string;
  onSaveWord?: (word: LyricWord, songTitle?: string) => void;
}

export default function LyricsPanel({
  lyrics,
  songTitle,
  songId,
  videoId,
  onSaveWord,
}: LyricsPanelProps) {
  const { user } = useAuth();
  const { pinyinVisible, togglePinyin, hskColorsEnabled, toggleHskColors } = useSettings();
  const { isFavorited, toggleFavorite, toggling: favoriteToggling } = useFavorites();
  const { notesByLine, addNote, deleteNote, reportContent } = useCommunityNotes(songId);

  const [selectedWord, setSelectedWord] = useState<LyricWord | null>(null);
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const [englishOverrides, setEnglishOverrides] = useState<Map<number, string> | null>(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [correctionMode, setCorrectionMode] = useState<'chinese' | 'pretranslated'>('chinese');
  const [correctionStatus, setCorrectionStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [reportTarget, setReportTarget] = useState<{ type: string; id: string } | null>(null);
  const [showHskKey, setShowHskKey] = useState(false);

  const favorited = songId ? isFavorited(songId) : false;

  // Build HSK color map from all words in lyrics
  const hskColorMap = useMemo(() => {
    if (!hskColorsEnabled) return undefined;
    const allWords = lyrics.flatMap(l => l.words || []);
    return buildHSKColorMap(allWords);
  }, [lyrics, hskColorsEnabled]);

  const handleWordClick = useCallback((word: LyricWord, event: React.MouseEvent) => {
    setSelectedWord(word);
    setPopoverPos({ x: event.clientX, y: event.clientY });
  }, []);

  const handleSaveWord = useCallback(
    (word: LyricWord) => {
      if (onSaveWord) onSaveWord(word, songTitle);
      setSelectedWord(null);
    },
    [onSaveWord, songTitle]
  );

  const handleClosePopover = useCallback(() => setSelectedWord(null), []);

  const handleSubmitCorrection = useCallback(async () => {
    if (!correctionText.trim() || !songId || !videoId) return;
    setCorrectionStatus('submitting');
    try {
      const { error } = await supabase.from('lyrics_corrections').insert({
        song_id: songId, video_id: videoId,
        submitted_by: user?.id || null,
        submitted_by_name: user?.email || 'Anonymous',
        raw_text: correctionText, mode: correctionMode, status: 'pending',
      });
      if (error) throw error;
      setCorrectionStatus('success');
      setCorrectionText('');
      setTimeout(() => { setCorrectionStatus('idle'); setShowCorrectionForm(false); }, 3000);
    } catch {
      setCorrectionStatus('error');
      setTimeout(() => setCorrectionStatus('idle'), 3000);
    }
  }, [correctionText, correctionMode, songId, videoId, user]);

  const toggleNotesForLine = (lineId: number) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(lineId) ? next.delete(lineId) : next.add(lineId);
      return next;
    });
  };

  if (lyrics.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 p-8 text-center">
        <p className="text-text-secondary">Paste a YouTube URL above to see lyrics here</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col rounded-xl bg-bg-secondary/50">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2">
        {/* Favorite */}
        {songId && user && (
          <button
            onClick={() => toggleFavorite(songId)}
            disabled={favoriteToggling}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={favorited}
            className={`rounded-lg p-1.5 transition-colors disabled:opacity-50 ${favorited ? 'text-red-400' : 'text-text-secondary hover:text-red-400'}`}
          >
            <Heart className={`h-4 w-4 transition-transform ${favorited ? 'fill-current' : ''} ${favoriteToggling ? 'animate-pulse' : ''}`} />
          </button>
        )}

        {/* Pinyin toggle */}
        <button
          onClick={togglePinyin}
          aria-label={pinyinVisible ? 'Hide pinyin' : 'Show pinyin'}
          aria-pressed={pinyinVisible}
          className="rounded-lg p-1.5 text-text-secondary transition-colors hover:text-text-primary"
          title={pinyinVisible ? 'Hide pinyin' : 'Show pinyin'}
        >
          {pinyinVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        {/* HSK colors toggle */}
        <div className="relative">
          <button
            onClick={toggleHskColors}
            aria-label={hskColorsEnabled ? 'Disable HSK color coding' : 'Enable HSK color coding'}
            aria-pressed={hskColorsEnabled}
            className={`rounded-lg p-1.5 transition-colors ${hskColorsEnabled ? 'text-china-red' : 'text-text-secondary hover:text-text-primary'}`}
            title="HSK color coding"
          >
            <Palette className="h-4 w-4" />
          </button>
          {hskColorsEnabled && (
            <button
              onClick={() => setShowHskKey(v => !v)}
              className="ml-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-text-secondary hover:bg-white/10 hover:text-text-primary"
              aria-label="Show HSK color key"
            >
              Key
            </button>
          )}
        </div>

        {/* Share */}
        {videoId && (
          <ShareButton
            url={`${window.location.origin}/?song=${videoId}`}
            title={songTitle || 'Check out this song on LyricLantern'}
          />
        )}

        {/* Translation selector */}
        {songId && (
          <div className="ml-auto w-32 sm:w-48">
            <TranslationSelector
              songId={songId}
              lyrics={lyrics}
              onTranslationChange={setEnglishOverrides}
            />
          </div>
        )}
      </div>

      {/* HSK Color Key */}
      {hskColorsEnabled && showHskKey && (
        <div className="border-b border-white/10 px-4 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className="font-medium text-text-secondary">HSK Levels:</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/40" /> 1 Beginner</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-500/40" /> 2 Elementary</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-500/40" /> 3 Intermediate</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500/40" /> 4 Upper-Int</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-500/40" /> 5 Advanced</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-500/40" /> 6 Mastery</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-500/40" /> Unknown</span>
          </div>
        </div>
      )}

      {/* Tags */}
      {songId && (
        <div className="border-b border-white/10 px-4 py-2">
          <TagInput songId={songId} />
        </div>
      )}

      {/* Lyrics */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {lyrics.map((line) => {
            const lineNotes = notesByLine.get(line.id);
            const noteCount = lineNotes?.length || 0;
            const notesExpanded = expandedNotes.has(line.id);

            return (
              <div key={line.id}>
                <div className="relative">
                  <LyricLine
                    line={line}
                    onWordClick={handleWordClick}
                    showPinyin={pinyinVisible}
                    englishOverride={englishOverrides?.get(line.id)}
                    hskColorMap={hskColorMap}
                    noteCount={noteCount}
                  />
                  {/* Notes toggle */}
                  {(noteCount > 0 || user) && (
                    <button
                      onClick={() => toggleNotesForLine(line.id)}
                      className={`absolute right-2 top-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                        notesExpanded ? 'bg-china-red/10 text-china-red-light' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <MessageSquare className="h-3 w-3" />
                      {noteCount > 0 && noteCount}
                    </button>
                  )}
                </div>

                {/* Expanded notes */}
                {notesExpanded && (
                  <div className="mt-1 space-y-1.5 border-l-2 border-white/10 pl-3 sm:ml-4">
                    {lineNotes?.map(note => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        currentUserId={user?.id}
                        onDelete={deleteNote}
                        onReport={(id) => setReportTarget({ type: 'note', id })}
                      />
                    ))}
                    {user && (
                      <AddNoteForm onSubmit={(content) => addNote(line.id, content)} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Suggest Correction */}
        {songId && videoId && (
          <div className="mt-4 border-t border-white/10 pt-4">
            {!showCorrectionForm ? (
              <button
                onClick={() => setShowCorrectionForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-text-secondary transition-colors hover:border-china-red/50 hover:text-text-primary"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Lyrics incorrect? Suggest a correction
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text-primary">Suggest Correction</h4>
                  <button onClick={() => setShowCorrectionForm(false)} className="text-text-secondary hover:text-text-primary">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-1 rounded-lg bg-bg-primary p-1">
                  <button
                    onClick={() => setCorrectionMode('chinese')}
                    className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${correctionMode === 'chinese' ? 'bg-china-red text-white' : 'text-text-secondary hover:text-text-primary'}`}
                  >Chinese Only</button>
                  <button
                    onClick={() => setCorrectionMode('pretranslated')}
                    className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${correctionMode === 'pretranslated' ? 'bg-china-red text-white' : 'text-text-secondary hover:text-text-primary'}`}
                  >Pre-translated</button>
                </div>
                <p className="text-xs text-text-secondary">
                  {correctionMode === 'chinese' ? 'Paste the correct Chinese lyrics.' : 'Format: Chinese | Pinyin | English'}
                </p>
                <textarea
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  placeholder={correctionMode === 'chinese' ? 'Paste correct Chinese lyrics here...' : '我爱你 | wǒ ài nǐ | I love you'}
                  className="w-full rounded-lg border border-white/10 bg-bg-primary p-2 font-chinese text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-china-red focus:outline-none"
                  rows={6}
                />
                {correctionStatus === 'success' ? (
                  <div className="flex items-center gap-2 text-xs text-green-400"><Check className="h-4 w-4" />Correction submitted!</div>
                ) : correctionStatus === 'error' ? (
                  <div className="text-xs text-china-red">Failed to submit.</div>
                ) : (
                  <button
                    onClick={handleSubmitCorrection}
                    disabled={!correctionText.trim() || correctionStatus === 'submitting'}
                    className="flex items-center gap-2 rounded-lg bg-china-red px-3 py-1.5 text-xs font-medium text-white hover:bg-china-red/80 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {correctionStatus === 'submitting' ? 'Submitting...' : 'Submit Correction'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Word Popover */}
      <WordPopover word={selectedWord} position={popoverPos} onSave={handleSaveWord} onClose={handleClosePopover} isLoggedIn={!!user} />

      {/* Report Modal */}
      <ReportModal
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={(reason) => {
          if (reportTarget) reportContent(reportTarget.type, reportTarget.id, reason);
          setReportTarget(null);
        }}
      />
    </div>
  );
}
