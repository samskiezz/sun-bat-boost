import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

const queryClient = new QueryClient({ 
  defaultOptions: { 
    queries: { 
      staleTime: 60_000, 
      retry: 1 
    } 
  } 
});

createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </GlobalErrorBoundary>
);
