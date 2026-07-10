import { Navigate, Route, Routes } from 'react-router-dom';
import { type ReactNode, Suspense } from 'react';
import { ROUTES } from '../const/app';
import LoginPage from '../loadables/Login';
import HomePage from '../loadables/Home';
import { FullPageLoader } from '@/components/LoadingFullPage';
import { useAuthStore } from '@/stores/authStore.ts';
import { NotFound } from '@/pages/NotFound';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const loading = useAuthStore((state) => state.loading);
  const me = useAuthStore((state) => state.user);
  if (loading) return <FullPageLoader />;
  if (!me) return <Navigate to={ROUTES.login} replace />;
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={'/'} element={<MainRoute />}></Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function MainRoute() {
  return (
    <ProtectedRoute>
      <Routes>
        <Route path={ROUTES.home} element={<HomePage />} />
      </Routes>
    </ProtectedRoute>
  );
}
