import { Link } from 'react-router-dom';
import { BookOpen, TrendingUp, LogIn, LogOut, User } from 'lucide-react';
import ChineseLantern from '../icons/ChineseLantern';
import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-bg-primary/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-text-primary no-underline">
          <ChineseLantern className="h-6 w-6" />
          <span>Lyric<span className="text-china-red">Lantern</span></span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary no-underline"
          >
            <ChineseLantern className="h-4 w-4" />
            <span className="hidden sm:inline">Learn</span>
          </Link>
          <Link
            to="/browse"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary no-underline"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Top Songs</span>
          </Link>
          {user && (
            <Link
              to="/vocabulary"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary no-underline"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Vocabulary</span>
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
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="ml-2 flex items-center gap-1.5 rounded-lg bg-china-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-china-red-dark no-underline"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
