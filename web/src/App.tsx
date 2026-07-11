import AppRoutes from './routes/AppRoutes';
import useMe from '@/hooks/api/useMe.ts';

export default function App() {
  useMe();

  return <AppRoutes />;
}
