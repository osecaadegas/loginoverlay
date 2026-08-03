import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import { queryClient } from './config/queryClient';
import './index.css';
import './styles/custom-fonts.css';
import './styles/theme-system.css';
import './styles/utilities.css';

const PRELOAD_RELOAD_KEY = 'streamers-center:preload-reload';
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) || 0);
  if (Date.now() - lastReload < 10000) return;
  sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
