import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Award, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MandarinChartList from '../components/songs/MandarinChartList';

export default function ChartsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [years, setYears] = useState<number[]>([]);
  const [loadingYears, setLoadingYears] = useState(true);
  const stripRef = useRef<HTMLDivElement>(null);

  // Which years actually have data. Only the `year` column is fetched, so this
  // stays small even with 50 songs x 20 years in the table.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // One row per year: every populated year has a rank 1. Avoids pulling
      // the whole table (and Supabase's 1000-row default cap) just to list years.
      const { data, error } = await supabase
        .from('mandarin_charts')
        .select('year')
        .eq('rank', 1)
        .order('year', { ascending: false });
      if (cancelled) return;
      if (error) {
        console.warn('Could not load chart years:', error.message);
        setYears([]);
      } else {
        const unique = [...new Set((data ?? []).map((r) => r.year as number))].sort((a, b) => b - a);
        setYears(unique);
      }
      setLoadingYears(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // The selected year lives in the URL (?year=2024) so a chart can be linked
  // and survives a refresh. Falls back to the newest year available.
  const requested = Number(searchParams.get('year'));
  const selectedYear = years.includes(requested) ? requested : (years[0] ?? 0);

  function pickYear(year: number) {
    setSearchParams({ year: String(year) }, { replace: true });
  }

  // Keep the active year visible in the scroll strip.
  useEffect(() => {
    if (!selectedYear || !stripRef.current) return;
    const active = stripRef.current.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [selectedYear]);

  const handleSongSelect = (url: string) => {
    navigate('/', { state: { songUrl: url } });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 text-center">
        <Award className="mx-auto h-10 w-10 text-china-red" />
        <h1 className="mt-4 text-2xl font-bold">Top Mandarin Songs by Year</h1>
        <p className="mt-2 text-text-secondary">
          The most-viewed Mandarin songs of each year. Pick a year to explore.
        </p>
      </div>

      {loadingYears ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-china-red" />
        </div>
      ) : years.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
          <h3 className="text-lg font-medium text-text-primary">No chart data yet</h3>
          <p className="mt-2 max-w-sm text-sm text-text-secondary">
            Run the discovery script to build the chart:
          </p>
          <pre className="mt-3 rounded-lg bg-bg-secondary px-4 py-2 text-xs text-text-secondary">
            npm run seed:charts
          </pre>
        </div>
      ) : (
        <>
          {/* Year selector. Horizontal scroll keeps 20 years usable on a phone. */}
          <div
            ref={stripRef}
            className="mb-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]"
            role="tablist"
            aria-label="Chart year"
          >
            {years.map((year) => {
              const active = year === selectedYear;
              return (
                <button
                  key={year}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-active={active}
                  onClick={() => pickYear(year)}
                  className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-china-red text-white'
                      : 'bg-bg-card text-text-secondary hover:bg-white/10 hover:text-text-primary'
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>

          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-text-primary">{selectedYear}</h2>
            <span className="text-xs text-text-secondary">ranked by views</span>
          </div>

          <MandarinChartList year={selectedYear} onSongSelect={handleSongSelect} />
        </>
      )}
    </div>
  );
}
