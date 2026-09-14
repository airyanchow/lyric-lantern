import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

interface SettingsContextType {
  pinyinVisible: boolean;
  togglePinyin: () => void;
  hskColorsEnabled: boolean;
  toggleHskColors: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
  pinyinVisible: true,
  togglePinyin: () => {},
  hskColorsEnabled: false,
  toggleHskColors: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [pinyinVisible, setPinyinVisible] = useState(() => {
    const stored = localStorage.getItem('lyric-lantern-pinyin');
    return stored !== null ? stored === 'true' : true;
  });
  const [hskColorsEnabled, setHskColorsEnabled] = useState(() => {
    return localStorage.getItem('lyric-lantern-hsk-colors') === 'true';
  });

  // Sync pinyin preference from profile when logged in
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('pinyin_visible')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data && data.pinyin_visible !== null) {
          setPinyinVisible(data.pinyin_visible);
        }
      });
  }, [user]);

  const togglePinyin = useCallback(() => {
    setPinyinVisible(prev => {
      const next = !prev;
      localStorage.setItem('lyric-lantern-pinyin', String(next));
      if (user) {
        supabase.from('profiles').update({ pinyin_visible: next }).eq('id', user.id);
      }
      return next;
    });
  }, [user]);

  const toggleHskColors = useCallback(() => {
    setHskColorsEnabled(prev => {
      const next = !prev;
      localStorage.setItem('lyric-lantern-hsk-colors', String(next));
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ pinyinVisible, togglePinyin, hskColorsEnabled, toggleHskColors }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
