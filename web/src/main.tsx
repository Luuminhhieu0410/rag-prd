import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import '@/helpers/i18n';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools/production';
import { ThemeProvider } from 'next-themes';
import ErrorBoundary from '@/components/ErrorBoundary';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ErrorBoundary>
          <App />
          <ReactQueryDevtools initialIsOpen={false} />
        </ErrorBoundary>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>,
  // </StrictMode>,
);
