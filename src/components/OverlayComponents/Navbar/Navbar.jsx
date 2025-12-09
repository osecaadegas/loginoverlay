import './Navbar.css';
import { useState, useEffect } from 'react';
import SpotifyWidget from '../SpotifyWidget/SpotifyWidget';

const Navbar = () => {
  const [currentTime, setCurrentTime] = useState('');
  const [streamerName, setStreamerName] = useState(() => {
    return localStorage.getItem('streamerName') || 'Streamer';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [logoSrc, setLogoSrc] = useState('https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png');
  const [cryptoPrices, setCryptoPrices] = useState([]);
  const [contentImage, setContentImage] = useState('/content.png'); // Default to content
  const contentImages = ['/wager.png', '/raw.png', '/content.png'];
  const [showSpotify, setShowSpotify] = useState(() => {
    return localStorage.getItem('showSpotify') === 'true';
  });

  const toggleContentImage = () => {
    setContentImage(prev => {
      const currentIndex = contentImages.indexOf(prev);
      const nextIndex = (currentIndex + 1) % contentImages.length;
      return contentImages[nextIndex];
    });
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchCryptoPrices = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,cardano,solana,ripple,dogecoin,polkadot&vs_currencies=usd&include_24hr_change=true');
        const data = await response.json();
        
        const formattedPrices = [
          { symbol: 'BTC', name: 'Bitcoin', price: data.bitcoin?.usd, change: data.bitcoin?.usd_24h_change, logo: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
          { symbol: 'ETH', name: 'Ethereum', price: data.ethereum?.usd, change: data.ethereum?.usd_24h_change, logo: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
          { symbol: 'BNB', name: 'BNB', price: data.binancecoin?.usd, change: data.binancecoin?.usd_24h_change, logo: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
          { symbol: 'SOL', name: 'Solana', price: data.solana?.usd, change: data.solana?.usd_24h_change, logo: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
          { symbol: 'XRP', name: 'XRP', price: data.ripple?.usd, change: data.ripple?.usd_24h_change, logo: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
          { symbol: 'ADA', name: 'Cardano', price: data.cardano?.usd, change: data.cardano?.usd_24h_change, logo: 'https://assets.coingecko.com/coins/images/975/small/cardano.png' },
          { symbol: 'DOGE', name: 'Dogecoin', price: data.dogecoin?.usd, change: data.dogecoin?.usd_24h_change, logo: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
          { symbol: 'DOT', name: 'Polkadot', price: data.polkadot?.usd, change: data.polkadot?.usd_24h_change, logo: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png' },
        ];
        
        setCryptoPrices(formattedPrices);
      } catch (error) {
        console.error('Failed to fetch crypto prices:', error);
      }
    };

    fetchCryptoPrices();
    const interval = setInterval(fetchCryptoPrices, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Listen for Spotify toggle events
  useEffect(() => {
    const handleToggleSpotify = (e) => {
      setShowSpotify(e.detail.show);
    };

    window.addEventListener('toggleSpotify', handleToggleSpotify);
    return () => window.removeEventListener('toggleSpotify', handleToggleSpotify);
  }, []);

  // Listen for streamer name changes from other components
  useEffect(() => {
    const handleStreamerNameChange = (e) => {
      setStreamerName(e.detail.name);
    };

    window.addEventListener('streamerNameChanged', handleStreamerNameChange);
    return () => window.removeEventListener('streamerNameChanged', handleStreamerNameChange);
  }, []);

  const handleLogoClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => setLogoSrc(e.target.result);
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleNameClick = () => setIsEditingName(true);
  const handleNameBlur = (e) => {
    const newName = e.target.value || 'Streamer';
    setStreamerName(newName);
    setIsEditingName(false);
    
    // Save to localStorage and notify other components
    localStorage.setItem('streamerName', newName);
    localStorage.setItem('twitchChannel', newName);
    window.dispatchEvent(new CustomEvent('streamerNameChanged', { detail: { name: newName } }));
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <img 
          src={logoSrc} 
          alt="Logo" 
          className="navbar-logo" 
          onClick={handleLogoClick}
          title="Click to change logo"
        />
        {isEditingName ? (
          <input
            type="text"
            defaultValue={streamerName}
            onBlur={handleNameBlur}
            onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
            autoFocus
            className="streamer-name-input"
          />
        ) : (
          <span 
            className="streamer-name" 
            onClick={handleNameClick}
            title="Click to edit streamer name"
          >
            {streamerName}
          </span>
        )}
        <img 
          src={contentImage} 
          alt="Content Badge" 
          className="content-badge" 
          onClick={toggleContentImage}
          title="Click to switch content badge"
        />
      </div>
      
      <div className="navbar-center">
        <span className="current-time">{currentTime}</span>
        {showSpotify && <SpotifyWidget />}
      </div>
      
      <div className="navbar-right">
        <div className="crypto-ticker">
          <div className="crypto-ticker-track">
            {cryptoPrices.length > 0 && (
              <>
                {[...cryptoPrices, ...cryptoPrices].map((crypto, index) => (
                  <div key={index} className="crypto-item">
                    <img src={crypto.logo} alt={crypto.symbol} className="crypto-logo" />
                    <div className="crypto-info">
                      <div className="crypto-name-row">
                        <span className="crypto-name">{crypto.name}</span>
                        <span className={`crypto-arrow ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
                          {crypto.change >= 0 ? '↑' : '↓'}
                        </span>
                      </div>
                      <div className="crypto-details-row">
                        <span className="crypto-price">${crypto.price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className={`crypto-change ${crypto.change >= 0 ? 'positive' : 'negative'}`}>
                          {Math.abs(crypto.change)?.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        <a href="https://www.begambleaware.org/" target="_blank" rel="noopener noreferrer" className="aware-link">
          Be Gamble Aware|+🔞
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
