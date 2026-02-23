import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../config/supabaseClient';
import { getMethodIcons } from '../../utils/depositMethods';
import { getProviderName } from '../../utils/gameProviders';
import './OffersPage.css';

export default function OffersPage() {
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
        
        {/* All Offers - Unified Card Grid */}
        <div className="offers-card-grid">
          {casinoOffers.map((offer, index) => (
            <div key={offer.id} className={`op-card ${index === 0 ? 'op-card-featured' : ''}`}>
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
                  <button className="op-card-info-btn" onClick={() => openInfoModal(offer)}>MORE INFO</button>
                  <span className="op-card-tc">+18 | T&C APPLY</span>
                </div>
              </div>

              {/* Stats Grid 2x2 */}
              <div className="op-card-stats">
                <div className="op-card-stat">
                  <span className="op-card-stat-icon">💰</span>
                  <div>
                    <span className="op-card-stat-label">Min. deposit</span>
                    <span className="op-card-stat-value">{offer.minDeposit || '—'}</span>
                  </div>
                </div>
                <div className="op-card-stat">
                  <span className="op-card-stat-icon">🔄</span>
                  <div>
                    <span className="op-card-stat-label">Cashback</span>
                    <span className="op-card-stat-value">{offer.cashback || '—'}</span>
                  </div>
                </div>
                <div className="op-card-stat">
                  <span className="op-card-stat-icon">🎁</span>
                  <div>
                    <span className="op-card-stat-label">Bonus value</span>
                    <span className="op-card-stat-value">{offer.bonusValue || '—'}</span>
                  </div>
                </div>
                <div className="op-card-stat">
                  <span className="op-card-stat-icon">🎰</span>
                  <div>
                    <span className="op-card-stat-label">Free spins</span>
                    <span className="op-card-stat-value">{offer.freeSpins || '—'}</span>
                  </div>
                </div>
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
          ))}
        </div>

        {/* Info Modal - Rendered via Portal */}
        {selectedOffer && createPortal(
          <div className="offer-modal-overlay" onClick={closeInfoModal}>
            <div className="offer-modal-v2" onClick={(e) => e.stopPropagation()}>
              {/* Header Row */}
              <div className="modal-v2-header">
                {selectedOffer.cryptoFriendly && (
                  <span className="modal-v2-badge">CRYPTO</span>
                )}
                <button className="modal-v2-close" onClick={closeInfoModal}>×</button>
              </div>
              
              {/* Casino Branding */}
              <div className="modal-v2-branding">
                <div className="modal-v2-logo-wrap">
                  <img src={selectedOffer.image} alt={selectedOffer.casino} className="modal-v2-logo" />
                </div>
                <p className="modal-v2-tagline">{selectedOffer.title || `Exclusive bonus at ${selectedOffer.casino}`}</p>
              </div>

              {/* Info Cards Grid */}
              <div className="modal-v2-section">
                <span className="modal-v2-section-label">CASINO INFO</span>
                <div className="modal-v2-cards-grid">
                  <div className="modal-v2-card">
                    <span className="card-label">MINIMUM DEPOSIT</span>
                    <span className="card-value highlight">{selectedOffer.minDeposit || '€20'}</span>
                  </div>
                  <div className="modal-v2-card">
                    <span className="card-label">MAX WITHDRAWAL</span>
                    <span className="card-value">{selectedOffer.maxWithdrawal}</span>
                  </div>
                  <div className="modal-v2-card">
                    <span className="card-label">WITHDRAWAL TIME</span>
                    <span className="card-value">{selectedOffer.withdrawalTime}</span>
                  </div>
                  <div className="modal-v2-card">
                    <span className="card-label">CRYPTO FRIENDLY</span>
                    <span className="card-value highlight">
                      {selectedOffer.cryptoFriendly ? '✓ Yes' : 'No'}
                    </span>
                  </div>
                  <div className="modal-v2-card">
                    <span className="card-label">LIVE SUPPORT</span>
                    <span className="card-value">{selectedOffer.liveSupport}</span>
                  </div>
                  <div className="modal-v2-card">
                    <span className="card-label">ESTABLISHED</span>
                    <span className="card-value">{selectedOffer.established}</span>
                  </div>
                </div>
              </div>

              {/* Licences & Languages - 2 Column */}
              <div className="modal-v2-details-row">
                <div className="modal-v2-detail">
                  <span className="detail-label">LICENCES</span>
                  <span className="detail-value">{selectedOffer.license || 'Curaçao'}</span>
                </div>
                <div className="modal-v2-detail">
                  <span className="detail-label">LANGUAGES</span>
                  <span className="detail-value">{selectedOffer.languages}</span>
                </div>
              </div>

              {/* Deposit Methods as Tags */}
              <div className="modal-v2-section">
                <span className="modal-v2-section-label">DEPOSIT METHODS</span>
                <div className="modal-v2-tags">
                  {selectedOffer.depositMethods ? (
                    getMethodIcons(selectedOffer.depositMethods).slice(0, 12).map((method, idx) => (
                      <span key={idx} className="modal-v2-tag">{method.name}</span>
                    ))
                  ) : (
                    ['Visa', 'Mastercard', 'Bitcoin', 'Ethereum', 'Skrill', 'Bank', 'Apple Pay', 'Google Pay', 'Paysafe', 'USDT', 'Litecoin', 'Neteller'].map((method, idx) => (
                      <span key={idx} className="modal-v2-tag">{method}</span>
                    ))
                  )}
                </div>
              </div>

              {/* Game Providers */}
              <div className="modal-v2-section">
                <span className="modal-v2-section-label">TOP GAME PROVIDERS</span>
                <div className="modal-v2-providers">
                  {(Array.isArray(selectedOffer.gameProviders) && selectedOffer.gameProviders.length > 0) ? (
                    selectedOffer.gameProviders.slice(0, 8).map((providerId, idx) => (
                      <span key={idx} className="modal-v2-provider">{getProviderName(providerId)}</span>
                    ))
                  ) : (
                    defaultProviders.slice(0, 8).map((provider, idx) => (
                      <span key={idx} className="modal-v2-provider">{provider}</span>
                    ))
                  )}
                </div>
              </div>

              {/* CTA Footer */}
              <div className="modal-v2-footer">
                <a 
                  href={selectedOffer.bonusLink || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="modal-v2-cta"
                >
                  CLAIM BONUS
                </a>
                <p className="modal-v2-disclaimer">T&C APPLY. 18+, NEW CUSTOMERS ONLY, BEGAMBLEAWARE.ORG, AD</p>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
