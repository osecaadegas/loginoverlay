import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { getMethodIcons } from '../../utils/depositMethods';
import { getProviderName } from '../../utils/gameProviders';
import './OffersPage.css';

export default function OffersPage() {
  const [casinoOffers, setCasinoOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flippedCards, setFlippedCards] = useState({}); // Track which cards are flipped

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
        const transformedOffers = data.map(offer => {
          // Parse game_providers if it's a string
          let gameProviders = offer.game_providers;
          if (typeof gameProviders === 'string') {
            try {
              gameProviders = JSON.parse(gameProviders);
            } catch {
              gameProviders = [];
            }
          }
          if (!Array.isArray(gameProviders)) {
            gameProviders = [];
          }
          
          // Parse highlights if it's a string
          let highlights = offer.highlights;
          if (typeof highlights === 'string') {
            try {
              highlights = JSON.parse(highlights);
            } catch {
              highlights = ['Exclusive offer', 'VIP program', 'Big bonuses'];
            }
          }
          if (!Array.isArray(highlights)) {
            highlights = ['Exclusive offer', 'VIP program', 'Big bonuses'];
          }
          
          return {
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
            gameProviders,
            totalGames: offer.total_games,
            license: offer.license,
            welcomeBonus: offer.welcome_bonus,
            cryptoFriendly: offer.crypto_friendly ?? true,
            liveSupport: offer.live_support || '24/7',
            established: offer.established || '2024',
            languages: offer.languages || 'English',
            videoUrl: offer.video_url || '',
            promoCode: offer.promo_code || '',
            highlights
          };
        });
        
        setCasinoOffers(transformedOffers || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setCasinoOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlip = (offerId) => {
    setFlippedCards(prev => ({ ...prev, [offerId]: !prev[offerId] }));
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
        
        {/* All Offers - Unified Card Grid */}
        <div className="offers-card-grid">
          {casinoOffers.map((offer, index) => (
            <div key={offer.id} className={`op-card-wrapper ${flippedCards[offer.id] ? 'flipped' : ''}`}>
              <div className="op-card-inner">
                {/* ===== FRONT FACE ===== */}
                <div className={`op-card op-card-front ${index === 0 ? 'op-card-featured' : ''}`}>
                  {/* Card Image with Badge */}
                  <div className="op-card-image">
                    {offer.videoUrl ? (
                      <video
                        src={offer.videoUrl}
                        autoPlay muted loop playsInline
                        className="op-card-media"
                      />
                    ) : (
                      <img src={offer.image} alt={offer.casino} className="op-card-media" />
                    )}
                    {index === 0 && (
                      <span className="op-card-badge op-card-badge-featured">
                        <span className="op-badge-dot"></span>
                        ⭐ FEATURED
                      </span>
                    )}
                    {index !== 0 && offer.badge && (
                      <span className={`op-card-badge ${offer.badgeClass || ''}`}>
                        <span className="op-badge-dot"></span>
                        {offer.badge}
                      </span>
                    )}
                  </div>

                  {/* Title Row */}
                  <div className="op-card-title-row">
                    <span className="op-card-title">{offer.title}</span>
                    <div className="op-card-title-right">
                      <button className="op-card-info-btn" onClick={() => toggleFlip(offer.id)}>MORE INFO</button>
                      <span className="op-card-tc">+18 | T&C APPLY</span>
                    </div>
                  </div>

                  {/* Stats Grid - only show filled fields */}
                  <div className="op-card-stats">
                    {offer.minDeposit && (
                      <div className="op-card-stat">
                        <span className="op-card-stat-icon"><i className="fa-solid fa-coins" /></span>
                        <div>
                          <span className="op-card-stat-label">Min. deposit</span>
                          <span className="op-card-stat-value">{offer.minDeposit}</span>
                        </div>
                      </div>
                    )}
                    {offer.cashback && (
                      <div className="op-card-stat">
                        <span className="op-card-stat-icon"><i className="fa-solid fa-rotate" /></span>
                        <div>
                          <span className="op-card-stat-label">Cashback</span>
                          <span className="op-card-stat-value">{offer.cashback}</span>
                        </div>
                      </div>
                    )}
                    {offer.bonusValue && (
                      <div className="op-card-stat">
                        <span className="op-card-stat-icon"><i className="fa-solid fa-gift" /></span>
                        <div>
                          <span className="op-card-stat-label">Bonus value</span>
                          <span className="op-card-stat-value">{offer.bonusValue}</span>
                        </div>
                      </div>
                    )}
                    {offer.freeSpins && (
                      <div className="op-card-stat">
                        <span className="op-card-stat-icon"><i className="fa-solid fa-dice" /></span>
                        <div>
                          <span className="op-card-stat-label">Free spins</span>
                          <span className="op-card-stat-value">{offer.freeSpins}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Promo Code */}
                  {offer.promoCode && (
                    <div className="op-card-promo">
                      <span className="op-card-promo-label">CODE:</span>
                      <span className="op-card-promo-value">{offer.promoCode}</span>
                    </div>
                  )}

                  {/* CTA */}
                  <a
                    href={offer.bonusLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="op-card-claim"
                  >
                    CLAIM BONUS
                  </a>
                </div>

                {/* ===== BACK FACE ===== */}
                <div className={`op-card op-card-back ${index === 0 ? 'op-card-featured' : ''}`}>
                  {/* Back Header */}
                  <div className="op-back-header">
                    <div className="op-back-logo-wrap">
                      <img src={offer.image} alt={offer.casino} className="op-back-logo" />
                    </div>
                    <div className="op-back-header-text">
                      <span className="op-back-casino">{offer.casino}</span>
                      {offer.cryptoFriendly && <span className="op-back-crypto-badge">CRYPTO</span>}
                    </div>
                    <button className="op-back-close" onClick={() => toggleFlip(offer.id)}>✕</button>
                  </div>

                  {/* Scrollable Info Content */}
                  <div className="op-back-content">
                    {/* Info Grid */}
                    <div className="op-back-section">
                      <span className="op-back-section-label">CASINO INFO</span>
                      <div className="op-back-info-grid">
                        {offer.minDeposit && (
                          <div className="op-back-info-item">
                            <span className="op-back-info-label">MIN DEPOSIT</span>
                            <span className="op-back-info-value gold">{offer.minDeposit}</span>
                          </div>
                        )}
                        {offer.maxWithdrawal && (
                          <div className="op-back-info-item">
                            <span className="op-back-info-label">MAX WITHDRAWAL</span>
                            <span className="op-back-info-value">{offer.maxWithdrawal}</span>
                          </div>
                        )}
                        {offer.withdrawalTime && (
                          <div className="op-back-info-item">
                            <span className="op-back-info-label">WITHDRAWAL TIME</span>
                            <span className="op-back-info-value">{offer.withdrawalTime}</span>
                          </div>
                        )}
                        <div className="op-back-info-item">
                          <span className="op-back-info-label">CRYPTO</span>
                          <span className="op-back-info-value gold">{offer.cryptoFriendly ? '✓ Yes' : 'No'}</span>
                        </div>
                        {offer.liveSupport && (
                          <div className="op-back-info-item">
                            <span className="op-back-info-label">LIVE SUPPORT</span>
                            <span className="op-back-info-value">{offer.liveSupport}</span>
                          </div>
                        )}
                        {offer.established && (
                          <div className="op-back-info-item">
                            <span className="op-back-info-label">ESTABLISHED</span>
                            <span className="op-back-info-value">{offer.established}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Licence & Languages */}
                    <div className="op-back-detail-row">
                      <div className="op-back-detail">
                        <span className="op-back-info-label">LICENCE</span>
                        <span className="op-back-info-value">{offer.license || 'Curaçao'}</span>
                      </div>
                      <div className="op-back-detail">
                        <span className="op-back-info-label">LANGUAGES</span>
                        <span className="op-back-info-value">{offer.languages}</span>
                      </div>
                    </div>

                    {/* Deposit Methods */}
                    <div className="op-back-section">
                      <span className="op-back-section-label">DEPOSIT METHODS</span>
                      <div className="op-back-tags">
                        {offer.depositMethods ? (
                          getMethodIcons(offer.depositMethods).slice(0, 8).map((method, idx) => (
                            <span key={idx} className="op-back-tag">{method.name}</span>
                          ))
                        ) : (
                          ['Visa', 'Mastercard', 'Bitcoin', 'Ethereum', 'Skrill', 'Bank'].map((method, idx) => (
                            <span key={idx} className="op-back-tag">{method}</span>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Game Providers */}
                    <div className="op-back-section">
                      <span className="op-back-section-label">TOP PROVIDERS</span>
                      <div className="op-back-tags">
                        {(Array.isArray(offer.gameProviders) && offer.gameProviders.length > 0) ? (
                          offer.gameProviders.slice(0, 6).map((providerId, idx) => (
                            <span key={idx} className="op-back-tag provider">{getProviderName(providerId)}</span>
                          ))
                        ) : (
                          defaultProviders.slice(0, 6).map((provider, idx) => (
                            <span key={idx} className="op-back-tag provider">{provider}</span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Back Footer */}
                  <div className="op-back-footer">
                    <a
                      href={offer.bonusLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="op-back-cta"
                    >
                      CLAIM BONUS
                    </a>
                    <p className="op-back-disclaimer">T&C APPLY. 18+, BEGAMBLEAWARE.ORG</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
