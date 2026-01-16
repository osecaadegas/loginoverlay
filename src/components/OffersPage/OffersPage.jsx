import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { getMethodIcons } from '../../utils/depositMethods';
import './OffersPage.css';

export default function OffersPage() {
  const [flippedCards, setFlippedCards] = useState({});
  const [casinoOffers, setCasinoOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('casino_offers')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error loading offers:', error);
        setCasinoOffers([]);
      } else {
        // Transform data to match component format
        const transformedOffers = data.map(offer => ({
          id: offer.id,
          badge: offer.badge,
          badgeClass: offer.badge_class,
          casino: offer.casino_name,
          title: offer.title,
          image: offer.image_url,
          bonusLink: offer.bonus_link,
          minDeposit: offer.min_deposit,
          cashback: offer.cashback,
          bonusValue: offer.bonus_value,
          freeSpins: offer.free_spins,
          depositMethods: offer.deposit_methods,
          vpnFriendly: offer.vpn_friendly,
          isPremium: offer.is_premium,
          details: offer.details,
          gameProviders: offer.game_providers,
          totalGames: offer.total_games,
          license: offer.license,
          welcomeBonus: offer.welcome_bonus
        }));
        
        setCasinoOffers(transformedOffers || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setCasinoOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlip = (id) => {
    setFlippedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (loading) {
    return (
      <div className="offers-page">
        <div className="offers-loading">Loading offers...</div>
      </div>
    );
  }

  if (casinoOffers.length === 0) {
    return (
      <div className="offers-page">
        <div className="offers-container">
          <h1>Casinos & Offers</h1>
          <div className="no-offers" style={{textAlign: 'center', padding: '60px 20px', color: 'white'}}>
            <p>No casino offers available at the moment. Check back soon!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="offers-page">
      <div className="offers-container">
        <h1>Casino Partners & Offers</h1>
        <p className="offers-subtitle">Exclusive bonuses and promotions from our trusted partners</p>
        
        {/* Featured Offer - First One Only */}
        {casinoOffers[0] && (
          <div className={`modern-offer-card featured ${flippedCards['featured'] ? 'flipped' : ''}`}>
            <div className="featured-badge">
              <span>⭐ FEATURED OFFER</span>
            </div>

            <div className="modern-offer-content">
              {/* Left Side - Casino Image */}
              <div className="offer-image-section">
                <div className="info-icon" title="More Information" onClick={() => setFlippedCards(prev => ({...prev, featured: !prev.featured}))}>
                  ℹ️
                </div>
                <img src={casinoOffers[0].image} alt={casinoOffers[0].casino} className="offer-casino-image" />
              </div>

              {/* Right Side - Details */}
              <div className="offer-details-section">
                {/* Casino Name with Premium Badge */}
                <div className="casino-header">
                  <h3 className="modern-casino-name">{casinoOffers[0].casino}</h3>
                  {casinoOffers[0].isPremium && (
                    <div className="premium-partner-badge">
                      <span>⭐</span>
                      <div className="partner-text">
                        <span className="partner-label">Premium Partner</span>
                        <span className="partner-sublabel">Licensed & Regulated</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Bonus Display */}
                <div className="bonus-highlight-box">
                  <div className="bonus-main-text">{casinoOffers[0].title}</div>
                  {casinoOffers[0].freeSpins && (
                    <div className="bonus-sub-text">+ {casinoOffers[0].freeSpins}</div>
                  )}
                  <div className="bonus-exclusive-tag">Exclusive Bonus!</div>
                </div>

                {/* Stats Grid */}
                <div className="modern-stats-grid">
                  <div className="modern-stat-item">
                    <span className="stat-icon">🎮</span>
                    <div className="stat-content">
                      <div className="stat-value-large">{casinoOffers[0].gameProviders || '90+'}</div>
                      <div className="stat-description">Game Providers</div>
                    </div>
                  </div>
                  <div className="modern-stat-item">
                    <span className="stat-icon">💳</span>
                    <div className="stat-content">
                      <div className="stat-value-large">70+</div>
                      <div className="stat-description">Payment Methods</div>
                    </div>
                  </div>
                  <div className="modern-stat-item">
                    <span className="stat-icon">🎰</span>
                    <div className="stat-content">
                      <div className="stat-value-large">{casinoOffers[0].totalGames || '15000+'}</div>
                      <div className="stat-description">Games</div>
                    </div>
                  </div>
                  <div className="modern-stat-item">
                    <span className="stat-icon">🛡️</span>
                    <div className="stat-content">
                      <div className="stat-value-large">{casinoOffers[0].license || 'Curaçao'}</div>
                      <div className="stat-description">License</div>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                {casinoOffers[0].depositMethods && (
                  <>
                    <div className="payment-methods-label">Available Payment Methods:</div>
                    <div className="payment-methods-badges">
                      {getMethodIcons(casinoOffers[0].depositMethods).slice(0, 12).map((method, idx) => (
                        <span key={idx} className="payment-badge" title={method.name}>
                          {method.icon} {method.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {/* Terms */}
                <div className="offer-terms-modern">
                  No promo code needed - Bonus activates automatically
                </div>

                {/* CTA Button */}
                <a 
                  href={casinoOffers[0].bonusLink || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="modern-claim-button"
                >
                  ✨ Claim Exclusive Bonus Now
                </a>
              </div>
            </div>
          </div>
        )}

        {/* More Offers Section - List Format */}
        {casinoOffers.length > 1 && (
          <>
            <div className="more-offers-section">
              <h2>More Great Offers</h2>
            </div>
            
            <div className="offers-list">
              {casinoOffers.slice(1).map((offer) => (
                <div key={offer.id} className="offer-list-card">
                  {!flippedCards[offer.id] ? (
                    /* Front Side */
                    <div className="offer-card-front">
                      <div className="offer-card-logo">
                        <img src={offer.image} alt={offer.casino} />
                      </div>
                      <div className="offer-card-name">{offer.casino}</div>
                      <div className="offer-card-stats">
                        {offer.bonusValue && (
                          <div className="offer-stat">
                            <span className="stat-label">BONUS</span>
                            <span className="stat-value">{offer.bonusValue}</span>
                          </div>
                        )}
                        {offer.freeSpins && (
                          <div className="offer-stat">
                            <span className="stat-label">FREE SPINS</span>
                            <span className="stat-value">{offer.freeSpins}</span>
                          </div>
                        )}
                        {offer.cashback && (
                          <div className="offer-stat">
                            <span className="stat-label">CASHBACK</span>
                            <span className="stat-value">{offer.cashback}</span>
                          </div>
                        )}
                      </div>
                      <div className="offer-card-buttons">
                        <a 
                          href={offer.bonusLink || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn-claim"
                        >
                          CLAIM BONUS
                        </a>
                        <button 
                          className="btn-more"
                          onClick={() => toggleFlip(offer.id)}
                        >
                          👁 SHOW MORE
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Back Side - Details */
                    <div className="offer-card-back">
                      <div className="back-header">
                        <span className="back-name">{offer.casino}</span>
                        <button className="back-close" onClick={() => toggleFlip(offer.id)}>✕</button>
                      </div>
                      <div className="back-info">
                        {offer.gameProviders && <span className="info-badge">🎮 {offer.gameProviders} Providers</span>}
                        {offer.totalGames && <span className="info-badge">🎰 {offer.totalGames} Games</span>}
                        {offer.license && <span className="info-badge">🛡️ {offer.license}</span>}
                        {offer.minDeposit && <span className="info-badge">💰 Min: {offer.minDeposit}</span>}
                        {offer.vpnFriendly && <span className="info-badge vpn">🌐 VPN OK</span>}
                        {offer.isPremium && <span className="info-badge premium">⭐ Premium</span>}
                      </div>
                      {offer.depositMethods && (
                        <div className="back-payments">
                          <span className="payments-label">Payments:</span>
                          {getMethodIcons(offer.depositMethods).slice(0, 6).map((method, idx) => (
                            <span key={idx} className="payment-icon" title={method.name}>{method.icon}</span>
                          ))}
                          {getMethodIcons(offer.depositMethods).length > 6 && (
                            <span className="payments-more">+{getMethodIcons(offer.depositMethods).length - 6}</span>
                          )}
                        </div>
                      )}
                      <a 
                        href={offer.bonusLink || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn-claim"
                      >
                        CLAIM BONUS
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
