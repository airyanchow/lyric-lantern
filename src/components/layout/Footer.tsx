import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-6 text-center text-sm text-text-secondary">
      <div className="mx-auto max-w-7xl px-4">
        <p className="flex items-center justify-center gap-1">
          Made with <Heart className="h-3.5 w-3.5 text-china-red" /> for Chinese language learners
        </p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <Link to="/privacy" className="transition-colors hover:text-text-primary">
            Privacy Policy
          </Link>
          <span className="text-white/20">|</span>
          <Link to="/terms" className="transition-colors hover:text-text-primary">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
