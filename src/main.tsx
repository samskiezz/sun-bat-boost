import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';

createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
);
