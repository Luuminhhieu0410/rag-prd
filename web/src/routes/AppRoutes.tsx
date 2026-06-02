import { Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, type ReactNode } from 'react';
import useAuth from '../hooks/useAuth';
import { ROUTES } from '../const/app';
import LoginPage from '../loadables/Login';
import HomePage from '../loadables/Home';

function FullPageLoader() {
  return (
    <div className="grid min-h-screen place-items-center text-muted-foreground">
      Loading…
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to={ROUTES.login} replace />;
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Routes>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route
          path={ROUTES.home}
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </Suspense>
  );
}
