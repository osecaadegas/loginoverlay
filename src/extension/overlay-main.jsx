import React from 'react';
import ReactDOM from 'react-dom/client';
import ExtensionOverlay from './ExtensionOverlay';
import { setTwitchAuth } from './extApi';

function App() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (window.Twitch && window.Twitch.ext) {
      window.Twitch.ext.onAuthorized((auth) => {
        setTwitchAuth(auth);
        setReady(true);
      });
    } else {
      console.warn('[Overlay] Twitch Helper not found — running in dev mode');
      setReady(true);
    }
  }, []);

  if (!ready) return null; // Transparent until ready

  return <ExtensionOverlay />;
}

ReactDOM.createRoot(document.getElementById('extension-overlay-root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
