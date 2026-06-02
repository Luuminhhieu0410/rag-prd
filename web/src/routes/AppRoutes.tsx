import { Navigate, Route, Routes } from 'react-router-dom';
import {type ReactNode, Suspense} from 'react';
import useAuth from '../hooks/useAuth';
import { ROUTES } from '../const/app';
import LoginPage from '../loadables/Login.tsx';
import HomePage from '../loadables/Home.tsx';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!user) return <Navigate to={ROUTES.login} replace />;
  return <>{children}</>;
}

export default function AppRoutes() {
  return (
   <Suspense fallback={<div style={{width: '100%', height: '700px'}} />}>
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
       </Routes>
   </Suspense>
  );
}
