import { useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import TopSongsList from '../components/songs/TopSongsList';

export default function BrowsePage() {
  const navigate = useNavigate();

  const handleSongSelect = (url: string) => {
    // Navigate to home page with the URL as state
    navigate('/', { state: { songUrl: url } });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <TrendingUp className="mx-auto h-10 w-10 text-china-red" />
        <h1 className="mt-4 text-2xl font-bold">Top Songs</h1>
        <p className="mt-2 text-text-secondary">
          The most popular Chinese songs being learned on LyricLantern
        </p>
      </div>
      <TopSongsList onSongSelect={handleSongSelect} />
    </div>
  );
}
