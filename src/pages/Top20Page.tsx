import { useNavigate } from 'react-router-dom';
import { Award } from 'lucide-react';
import MandarinChartList from '../components/songs/MandarinChartList';

export default function Top20Page() {
  const navigate = useNavigate();

  const handleSongSelect = (url: string) => {
    navigate('/', { state: { songUrl: url } });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 text-center">
        <Award className="mx-auto h-10 w-10 text-china-red" />
        <h1 className="mt-4 text-2xl font-bold">Top 20 Mandarin Songs by Year</h1>
        <p className="mt-2 text-text-secondary">
          The most-viewed Mandarin songs of each year, 2006–2025
        </p>
      </div>
      <MandarinChartList onSongSelect={handleSongSelect} />
    </div>
  );
}
