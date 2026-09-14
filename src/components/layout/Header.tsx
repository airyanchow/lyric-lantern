import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Award, BookOpen, TrendingUp, LogIn, LogOut, User, ShieldCheck, Layers, BarChart3, ListMusic, Menu, X } from 'lucide-react';
import ChineseLantern from '../icons/ChineseLantern';
import { useAuth } from '../../hooks/useAuth';
import { useAdmin } from '../../hooks/useAdmin';
import { supabase } from '../../lib/supabase';

const NAV_LINK = 'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary no-underline';
const MOBILE_NAV_LINK = 'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary no-underline';

export default function Header() {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const [pendingCount, setPendingCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Close on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMobileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOpen]);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchCount = () => {
      supabase
        .from('lyrics_corrections')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .then(({ count }) => setPendingCount(count || 0));
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-bg-primary/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-text-primary no-underline">
          <ChineseLantern className="h-6 w-6" />
          <span>Lyric<span className="text-china-red">Lantern</span></span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/browse" className={NAV_LINK}>
            <TrendingUp className="h-4 w-4" /> Browse Songs
          </Link>
          <Link to="/top20" className={NAV_LINK}>
            <Award className="h-4 w-4" /> Top 20
          </Link>
          {user && (
            <>
              <Link to="/vocabulary" className={NAV_LINK}>
                <BookOpen className="h-4 w-4" /> Vocab
              </Link>
              <Link to="/flashcards" className={NAV_LINK}>
                <Layers className="h-4 w-4" /> Flashcards
              </Link>
              <Link to="/playlists" className={NAV_LINK}>
                <ListMusic className="h-4 w-4" /> Playlists
              </Link>
              <Link to="/dashboard" className={NAV_LINK}>
                <BarChart3 className="h-4 w-4" /> Dashboard
              </Link>
            </>
          )}
          {isAdmin && (
            <Link to="/admin" className={`relative ${NAV_LINK}`}>
              <ShieldCheck className="h-4 w-4" /> Admin
              {pendingCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-china-red px-1 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          )}

          {/* Auth */}
          {user ? (
            <div className="ml-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-china-red text-sm font-medium text-white">
                <User className="h-4 w-4" />
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="ml-2 flex items-center gap-1.5 rounded-lg bg-china-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-china-red-dark no-underline"
            >
              <LogIn className="h-4 w-4" /> Sign In
            </Link>
          )}
        </nav>

        {/* Mobile hamburger + auth */}
        <div className="flex items-center gap-2 md:hidden">
          {!user && (
            <Link to="/login" className="flex items-center gap-1.5 rounded-lg bg-china-red px-4 py-2 text-sm font-medium text-white no-underline">
              <LogIn className="h-4 w-4" /> Sign In
            </Link>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-white/5 hover:text-text-primary"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div ref={menuRef} className="border-t border-white/10 bg-bg-primary/95 backdrop-blur-md md:hidden">
          <nav className="mx-auto max-w-7xl space-y-1 px-4 py-3">
            <Link to="/browse" className={MOBILE_NAV_LINK}>
              <TrendingUp className="h-4 w-4" /> Browse Songs
            </Link>
            <Link to="/top20" className={MOBILE_NAV_LINK}>
              <Award className="h-4 w-4" /> Top 20
            </Link>
            {user && (
              <>
                <Link to="/vocabulary" className={MOBILE_NAV_LINK}>
                  <BookOpen className="h-4 w-4" /> Vocabulary
                </Link>
                <Link to="/flashcards" className={MOBILE_NAV_LINK}>
                  <Layers className="h-4 w-4" /> Flashcards
                </Link>
                <Link to="/playlists" className={MOBILE_NAV_LINK}>
                  <ListMusic className="h-4 w-4" /> Playlists
                </Link>
                <Link to="/dashboard" className={MOBILE_NAV_LINK}>
                  <BarChart3 className="h-4 w-4" /> Dashboard
                </Link>
              </>
            )}
            {isAdmin && (
              <Link to="/admin" className={MOBILE_NAV_LINK}>
                <ShieldCheck className="h-4 w-4" /> Admin
                {pendingCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-china-red px-1 text-[10px] font-bold text-white">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}
            {user && (
              <div className="border-t border-white/10 pt-2 mt-2">
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-secondary hover:bg-white/5 hover:text-text-primary"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
