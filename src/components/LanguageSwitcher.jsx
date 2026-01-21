import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import 'flag-icons/css/flag-icons.min.css';
import './LanguageSwitcher.css';

/**
 * Language Switcher Component
 * Displays current language flag and allows switching between languages
 * Uses flag-icons library for high-quality flag sprites
 */
const LanguageSwitcher = ({ 
  variant = 'dropdown',  // 'dropdown' | 'inline' | 'compact'
  showLabel = true,
  className = ''
}) => {
  const { language, setLanguage, supportedLanguages, isChanging } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Only show EN and PT languages
  const allowedLanguages = ['en', 'pt'];
  const filteredLanguages = supportedLanguages.filter(lang => 
    allowedLanguages.includes(lang.code)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get current language data
  const currentLanguage = filteredLanguages.find(l => l.code === language) || {
    code: 'en',
    name: 'English (UK)',
    native_name: 'English'
  };

  // Get flag-icons class for language code
  const getFlagClass = (langCode) => {
    if (langCode === 'pt') return 'fi fi-pt';
    if (langCode === 'en') return 'fi fi-gb-eng';
    return 'fi fi-gb';
  };

  const handleLanguageChange = async (langCode) => {
    if (langCode !== language) {
      await setLanguage(langCode);
    }
    setIsOpen(false);
  };

  // Compact variant - just flags in a row
  if (variant === 'compact') {
    return (
      <div className={`language-switcher language-switcher--compact ${className}`}>
        {filteredLanguages.map(lang => (
          <button
            key={lang.code}
            className={`language-switcher__flag-btn ${language === lang.code ? 'active' : ''}`}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isChanging}
            title={lang.native_name || lang.name}
          >
            <span className={getFlagClass(lang.code)}></span>
          </button>
        ))}
      </div>
    );
  }

  // Inline variant - buttons side by side
  if (variant === 'inline') {
    return (
      <div className={`language-switcher language-switcher--inline ${className}`}>
        {filteredLanguages.map(lang => (
          <button
            key={lang.code}
            className={`language-switcher__btn ${language === lang.code ? 'active' : ''}`}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isChanging}
          >
            <span className={getFlagClass(lang.code)}></span>
            {showLabel && (
              <span className="language-switcher__label">{lang.code.toUpperCase()}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div 
      className={`language-switcher language-switcher--dropdown ${className}`}
      ref={dropdownRef}
    >
      <button
        className="language-switcher__trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isChanging}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className={getFlagClass(currentLanguage.code)}></span>
        {showLabel && (
          <span className="language-switcher__label">
            {currentLanguage.code.toUpperCase()}
          </span>
        )}
        <span className={`language-switcher__arrow ${isOpen ? 'open' : ''}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <ul className="language-switcher__menu" role="listbox">
          {filteredLanguages.map(lang => (
            <li key={lang.code}>
              <button
                className={`language-switcher__option ${language === lang.code ? 'active' : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
                role="option"
                aria-selected={language === lang.code}
              >
                <span className={getFlagClass(lang.code)}></span>
                <span className="language-switcher__name">
                  {lang.native_name || lang.name}
                </span>
                {language === lang.code && (
                  <span className="language-switcher__check">✓</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {isChanging && (
        <div className="language-switcher__loading">
          <span className="language-switcher__spinner"></span>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
