import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-6 text-center text-sm text-text-secondary">
      <div className="mx-auto max-w-7xl px-4">
        <p className="flex items-center justify-center gap-1">
          Made with <Heart className="h-3.5 w-3.5 text-china-red" /> for Chinese language learners
        </p>
      </div>
    </footer>
  );
}
