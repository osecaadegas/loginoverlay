import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { getMethodIcons } from '../../utils/depositMethods';
import './OffersPage.css';

export default function OffersPage() {
  const [flippedCards, setFlippedCards] = useState({});
  const [casinoOffers, setCasinoOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState(null); // For modal

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
          maxWithdrawal: offer.max_withdrawal || '€5,000 per week',
          withdrawalTime: offer.withdrawal_time || 'Up to 24h',
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
          welcomeBonus: offer.welcome_bonus,
          cryptoFriendly: offer.crypto_friendly ?? true,
          liveSupport: offer.live_support || '24/7',
          established: offer.established || '2024',
          languages: offer.languages || 'English',
          highlights: offer.highlights || ['Exclusive offer', 'VIP program', 'Big bonuses']
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

  const openInfoModal = (offer) => {
    setSelectedOffer(offer);
  };

  const closeInfoModal = () => {
    setSelectedOffer(null);
  };

  // Game provider logos/names
  const defaultProviders = ['Pragmatic Play', 'Hacksaw', 'Evolution', 'Quickspin', 'ELK', 'Red Tiger', 'Playson', 'NetEnt'];

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

        {/* More Offers Section - New Row Design */}
        {casinoOffers.length > 1 && (
          <>
            <div className="more-offers-section">
              <h2>More Great Offers</h2>
            </div>
            
            <div className="offers-rows">
              {casinoOffers.slice(1).map((offer) => (
                <div key={offer.id} className="offer-row">
                  {/* Logo */}
                  <div className="offer-row-logo">
                    <img src={offer.image} alt={offer.casino} />
                  </div>

                  {/* Stats Columns */}
                  <div className="offer-row-stats">
                    {offer.bonusValue && (
                      <div className="stat-column">
                        <span className="stat-label">{offer.freeSpins ? 'BONUS UP TO' : 'BONUS'}</span>
                        <span className="stat-value">{offer.bonusValue}</span>
                      </div>
                    )}
                    {offer.freeSpins && (
                      <div className="stat-column">
                        <span className="stat-label">FREE SPINS</span>
                        <span className="stat-value">{offer.freeSpins}</span>
                      </div>
                    )}
                    {offer.cashback && (
                      <div className="stat-column">
                        <span className="stat-label">CASHBACK</span>
                        <span className="stat-value">{offer.cashback}</span>
                      </div>
                    )}
                    {!offer.cashback && !offer.freeSpins && (
                      <div className="stat-column">
                        <span className="stat-label">-</span>
                        <span className="stat-value">-</span>
                      </div>
                    )}
                  </div>

                  {/* Highlights */}
                  <div className="offer-row-highlights">
                    {(offer.highlights || ['Exclusive offer', 'VIP program', 'Big bonuses']).slice(0, 3).map((highlight, idx) => (
                      <div key={idx} className="highlight-item">
                        <span className="highlight-check">✓</span>
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="offer-row-actions">
                    <a 
                      href={offer.bonusLink || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-claim-row"
                    >
                      CLAIM BONUS
                    </a>
                    <button 
                      className="btn-info"
                      onClick={() => openInfoModal(offer)}
                      title="More Information"
                    >
                      ℹ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Info Modal */}
        {selectedOffer && (
          <div className="offer-modal-overlay" onClick={closeInfoModal}>
            <div className="offer-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeInfoModal}>×</button>
              
              {/* Badge */}
              {selectedOffer.cryptoFriendly && (
                <div className="modal-badge crypto">🔶 CRYPTO</div>
              )}
              
              {/* Casino Logo & Title */}
              <div className="modal-header">
                <img src={selectedOffer.image} alt={selectedOffer.casino} className="modal-logo" />
                <p className="modal-description">{selectedOffer.title || `Free spins at ${selectedOffer.casino}`}</p>
              </div>

              {/* Casino Info Grid */}
              <div className="modal-section">
                <h4>CASINO INFO</h4>
                <div className="modal-info-grid">
                  <div className="info-item">
                    <span className="info-label">Minimum deposit</span>
                    <span className="info-value gold">{selectedOffer.minDeposit || '€20'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Maximum withdrawal</span>
                    <span className="info-value">{selectedOffer.maxWithdrawal}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Withdrawal time</span>
                    <span className="info-value">{selectedOffer.withdrawalTime}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Crypto friendly</span>
                    <span className="info-value gold">{selectedOffer.cryptoFriendly ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Live support</span>
                    <span className="info-value">{selectedOffer.liveSupport}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Established</span>
                    <span className="info-value">{selectedOffer.established}</span>
                  </div>
                </div>
              </div>

              {/* Licences */}
              <div className="modal-section">
                <h4>Licences</h4>
                <p className="modal-text">{selectedOffer.license || 'Curaçao'}</p>
              </div>

              {/* Languages */}
              <div className="modal-section">
                <h4>Languages</h4>
                <p className="modal-text">{selectedOffer.languages}</p>
              </div>

              {/* Deposit Methods */}
              <div className="modal-section">
                <h4>Deposit Methods</h4>
                <p className="modal-text-small">
                  {selectedOffer.depositMethods 
                    ? getMethodIcons(selectedOffer.depositMethods).map(m => m.name).join(', ')
                    : 'Bitcoin, Cashlib, CashtoCode, Ethereum, Flexepin, inpay, Litecoin, Skrill, Tether, Zimpler, MiFinity, Tron, Binance, Apple Pay, Google Pay, NodaPay, CryptoCurrency, Paysafe Card'
                  }
                </p>
              </div>

              {/* Game Providers */}
              <div className="modal-section">
                <h4>TOP GAME PROVIDERS</h4>
                <div className="modal-providers">
                  {defaultProviders.map((provider, idx) => (
                    <div key={idx} className="provider-badge">{provider}</div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <a 
                href={selectedOffer.bonusLink || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="modal-claim-btn"
              >
                CLAIM BONUS
              </a>

              <p className="modal-terms">T&C APPLY. 18+, NEW CUSTOMERS ONLY, BEGAMBLEAWARE.ORG, AD</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
