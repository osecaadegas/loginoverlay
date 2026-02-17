import { useState, useEffect } from 'react';
import { supabase } from '../../config/supabaseClient';
import { getMethodIcons } from '../../utils/depositMethods';
import { getProviderImage, getProviderName } from '../../utils/gameProviders';
import './OffersPage.css';

export default function OffersPage() {
  const [casinoOffers, setCasinoOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState(null);

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
        const transformedOffers = data.map(offer => ({
          id: offer.id,
          casino: offer.casino_name,
          title: offer.title,
          image: offer.image_url,
          bonusLink: offer.bonus_link,
          minDeposit: offer.min_deposit,
          maxWithdrawal: offer.max_withdrawal || '€5,000/week',
          withdrawalTime: offer.withdrawal_time || 'Up to 24h',
          cashback: offer.cashback,
          bonusValue: offer.bonus_value,
          freeSpins: offer.free_spins,
          depositMethods: offer.deposit_methods,
          vpnFriendly: offer.vpn_friendly,
          isPremium: offer.is_premium,
          gameProviders: offer.game_providers,
          totalGames: offer.total_games,
          license: offer.license || 'Curaçao',
          cryptoFriendly: offer.crypto_friendly ?? true,
          liveSupport: offer.live_support || '24/7',
          established: offer.established || '2024',
          languages: offer.languages || 'English',
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

  const openInfoModal = (offer) => setSelectedOffer(offer);
  const closeInfoModal = () => setSelectedOffer(null);

  const defaultProviders = ['Pragmatic Play', 'Hacksaw', 'Evolution', 'NetEnt', 'Quickspin'];

  if (loading) {
    return (
      <div className="offers-page">
        <div className="offers-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (casinoOffers.length === 0) {
    return (
      <div className="offers-page">
        <div className="offers-container">
          <div className="offers-empty">
            <p>No partner offers available at the moment.</p>
          </div>
        </div>
      </div>
    );
  }

  const featuredOffer = casinoOffers[0];
  const secondaryOffers = casinoOffers.slice(1);

  return (
    <div className="offers-page">
      <div className="offers-container">
        
        {/* Section Header */}
        <header className="offers-header">
          <h1>Partner Platforms</h1>
          <p>Verified platforms with exclusive member benefits</p>
        </header>

        {/* Featured Partner Card */}
        {featuredOffer && (
          <article className="featured-card">
            <div className="featured-content">
              
              {/* Logo Section */}
              <div className="featured-logo">
                <img src={featuredOffer.image} alt={featuredOffer.casino} />
              </div>

              {/* Info Section */}
              <div className="featured-info">
                <h2 className="featured-name">{featuredOffer.casino}</h2>
                <p className="featured-headline">{featuredOffer.title}</p>

                {/* Value Pills */}
                <div className="value-pills">
                  {featuredOffer.bonusValue && (
                    <div className="value-pill">
                      <span className="pill-label">Bonus</span>
                      <span className="pill-value">{featuredOffer.bonusValue}</span>
                    </div>
                  )}
                  {featuredOffer.freeSpins && (
                    <div className="value-pill">
                      <span className="pill-label">Free Spins</span>
                      <span className="pill-value">{featuredOffer.freeSpins}</span>
                    </div>
                  )}
                  {featuredOffer.cashback && (
                    <div className="value-pill">
                      <span className="pill-label">Cashback</span>
                      <span className="pill-value">{featuredOffer.cashback}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA Section */}
              <div className="featured-cta">
                <a 
                  href={featuredOffer.bonusLink || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  View Offer
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
                <button 
                  className="btn-details"
                  onClick={() => openInfoModal(featuredOffer)}
                  aria-label="View details"
                >
                  Details
                </button>
              </div>
            </div>

            {/* Trust Bar */}
            <div className="trust-bar">
              <span className="trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z"/></svg>
                Licensed
              </span>
              <span className="trust-divider">·</span>
              <span className="trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>
                Fast Payouts
              </span>
              <span className="trust-divider">·</span>
              <span className="trust-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                {featuredOffer.liveSupport} Support
              </span>
              {featuredOffer.cryptoFriendly && (
                <>
                  <span className="trust-divider">·</span>
                  <span className="trust-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    Crypto
                  </span>
                </>
              )}
            </div>
          </article>
        )}

        {/* Secondary Offers */}
        {secondaryOffers.length > 0 && (
          <section className="secondary-section">
            <h3 className="secondary-title">More Partners</h3>
            
            <div className="offers-list">
              {secondaryOffers.map((offer) => (
                <article key={offer.id} className="offer-row">
                  
                  {/* Logo */}
                  <div className="row-logo">
                    <img src={offer.image} alt={offer.casino} />
                  </div>

                  {/* Name */}
                  <div className="row-name">
                    <span>{offer.casino}</span>
                  </div>

                  {/* Values */}
                  <div className="row-values">
                    {offer.bonusValue && <span className="row-value">{offer.bonusValue}</span>}
                    {offer.freeSpins && <span className="row-value-muted">{offer.freeSpins} FS</span>}
                    {offer.cashback && !offer.freeSpins && <span className="row-value-muted">{offer.cashback} CB</span>}
                  </div>

                  {/* CTA */}
                  <div className="row-cta">
                    <button 
                      className="btn-text"
                      onClick={() => openInfoModal(offer)}
                    >
                      Details
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Compliance Footer */}
        <footer className="offers-footer">
          <p>18+ · Gambling involves risk · Partners licensed under respective jurisdictions · Terms apply · <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">BeGambleAware.org</a></p>
        </footer>

        {/* Details Modal */}
        {selectedOffer && (
          <div className="modal-overlay" onClick={closeInfoModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={closeInfoModal} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
              
              {/* Modal Header */}
              <div className="modal-header">
                <img src={selectedOffer.image} alt={selectedOffer.casino} className="modal-logo" />
                <div className="modal-title-section">
                  <h2>{selectedOffer.casino}</h2>
                  <p>{selectedOffer.title}</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="modal-info-grid">
                <div className="info-cell">
                  <span className="info-label">Min. Deposit</span>
                  <span className="info-value">{selectedOffer.minDeposit || '€20'}</span>
                </div>
                <div className="info-cell">
                  <span className="info-label">Max Withdrawal</span>
                  <span className="info-value">{selectedOffer.maxWithdrawal}</span>
                </div>
                <div className="info-cell">
                  <span className="info-label">Payout Time</span>
                  <span className="info-value">{selectedOffer.withdrawalTime}</span>
                </div>
                <div className="info-cell">
                  <span className="info-label">Crypto</span>
                  <span className="info-value">{selectedOffer.cryptoFriendly ? 'Yes' : 'No'}</span>
                </div>
                <div className="info-cell">
                  <span className="info-label">Support</span>
                  <span className="info-value">{selectedOffer.liveSupport}</span>
                </div>
                <div className="info-cell">
                  <span className="info-label">License</span>
                  <span className="info-value">{selectedOffer.license}</span>
                </div>
              </div>

              {/* Providers */}
              <div className="modal-section">
                <h4>Game Providers</h4>
                <div className="providers-list">
                  {(selectedOffer.gameProviders && selectedOffer.gameProviders.length > 0) ? (
                    selectedOffer.gameProviders.slice(0, 8).map((providerId, idx) => (
                      <div key={idx} className="provider-item">
                        <img 
                          src={getProviderImage(providerId)} 
                          alt={getProviderName(providerId)}
                          onError={(e) => e.target.style.display = 'none'}
                        />
                        <span>{getProviderName(providerId)}</span>
                      </div>
                    ))
                  ) : (
                    defaultProviders.map((provider, idx) => (
                      <div key={idx} className="provider-item text-only">
                        <span>{provider}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="modal-section">
                <h4>Payment Methods</h4>
                <p className="methods-text">
                  {selectedOffer.depositMethods 
                    ? getMethodIcons(selectedOffer.depositMethods).slice(0, 10).map(m => m.name).join(' · ')
                    : 'Bitcoin · Visa · Mastercard · Skrill · Neteller · Bank Transfer'
                  }
                </p>
              </div>

              {/* Modal CTA */}
              <a 
                href={selectedOffer.bonusLink || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="modal-cta"
              >
                View Offer
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>

              <p className="modal-disclaimer">18+ · T&C Apply · New Customers Only</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
