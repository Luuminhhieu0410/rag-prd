import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { type ReactNode, Suspense } from 'react';
import { ROUTES } from '../const/app';
import LoginPage from '../loadables/Login';
import HomePage from '../loadables/Home';
import CollectionPage from '../loadables/Collection';
import { FullPageLoader } from '@/components/LoadingFullPage';
import { useAuthStore } from '@/stores/authStore.ts';
import { NotFound } from '@/pages/NotFound';
import CollectionCreating from '@/pages/Home/components/CollectionCreating';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const loading = useAuthStore((state) => state.loading);
  const me = useAuthStore((state) => state.user);
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!me)
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;

  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<FullPageLoader message={'Initializing...'} />}>
      <Routes>
        <Route path={'/login'} element={<LoginPage />} />
        <Route path="/*" element={<MainRoute />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function MainRoute() {
  return (
    <ProtectedRoute>
      <Routes>
        <Route path={''} element={<HomePage />} />
        <Route path={'collection/:id'} element={<CollectionPage />} />
        <Route path={'collection/creating'} element={<CollectionCreating />} />
        <Route path={'*'} element={<NotFound />} />
      </Routes>
    </ProtectedRoute>
  );
}
