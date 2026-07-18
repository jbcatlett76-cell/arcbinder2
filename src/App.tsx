import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage').then((module) => ({ default: module.WorkspacePage })));

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="app-loading">Opening ArcBinder…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AuthCallback() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/app" replace />;
  if (!loading && !user) return <Navigate to="/login" replace />;
  return <div className="app-loading">Completing sign-in…</div>;
}

export default function App() {
  return (
    <Suspense fallback={<div className="app-loading">Opening ArcBinder…</div>}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/app" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/app/project/:projectId" element={<Protected><WorkspacePage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
