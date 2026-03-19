import React from 'react';
import ReactDOM from 'react-dom/client';
import ExtensionPanel from './ExtensionPanel';
import { setTwitchAuth } from './extApi';
import './ExtensionPanel.css';

function App() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // Wait for Twitch Extension Helper to be available
    if (window.Twitch && window.Twitch.ext) {
      window.Twitch.ext.onAuthorized((auth) => {
        setTwitchAuth(auth);
        setReady(true);
      });
    } else {
      // Fallback for local development without Twitch iframe
      console.warn('[Extension] Twitch Helper not found — running in dev mode');
      setReady(true);
    }
  }, []);

  if (!ready) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: '#efeff1',
        background: '#0e0e10',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        Connecting...
      </div>
    );
  }

  return <ExtensionPanel />;
}

ReactDOM.createRoot(document.getElementById('extension-root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
