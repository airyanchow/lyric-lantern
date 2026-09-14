import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import AuthGuard from './components/auth/AuthGuard';

// Lazy-load secondary pages for faster initial load
const BrowsePage = lazy(() => import('./pages/BrowsePage'));
const VocabularyPage = lazy(() => import('./pages/VocabularyPage'));
const FlashcardsPage = lazy(() => import('./pages/FlashcardsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PlaylistsPage = lazy(() => import('./pages/PlaylistsPage'));
const PlaylistDetailPage = lazy(() => import('./pages/PlaylistDetailPage'));
const SentenceBuilderPage = lazy(() => import('./pages/SentenceBuilderPage'));
const ChartsPage = lazy(() => import('./pages/ChartsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-text-pinyin border-t-transparent" />
    </div>
  );
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'browse', element: <LazyPage><BrowsePage /></LazyPage> },
      { path: 'charts', element: <LazyPage><ChartsPage /></LazyPage> },
      // Legacy link target: the chart moved to /charts with a year selector.
      { path: 'top20', element: <Navigate to="/charts" replace /> },
      { path: 'login', element: <LoginPage /> },
      {
        path: 'vocabulary',
        element: <AuthGuard><LazyPage><VocabularyPage /></LazyPage></AuthGuard>,
      },
      { path: 'flashcards', element: <LazyPage><FlashcardsPage /></LazyPage> },
      {
        path: 'dashboard',
        element: <AuthGuard><LazyPage><DashboardPage /></LazyPage></AuthGuard>,
      },
      { path: 'playlists', element: <LazyPage><PlaylistsPage /></LazyPage> },
      { path: 'playlists/:id', element: <LazyPage><PlaylistDetailPage /></LazyPage> },
      {
        path: 'practice/sentences',
        element: <LazyPage><SentenceBuilderPage /></LazyPage>,
      },
      {
        path: 'admin',
        element: <AuthGuard><LazyPage><AdminPage /></LazyPage></AuthGuard>,
      },
      { path: 'privacy', element: <LazyPage><PrivacyPage /></LazyPage> },
      { path: 'terms', element: <LazyPage><TermsPage /></LazyPage> },
    ],
  },
]);

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <RouterProvider router={router} />
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
