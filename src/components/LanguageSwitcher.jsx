import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import './LanguageSwitcher.css';

/**
 * Language Switcher Component
 * Displays current language flag and allows switching between languages
 */
const LanguageSwitcher = ({ 
  variant = 'dropdown',  // 'dropdown' | 'inline' | 'compact'
  showLabel = true,
  className = ''
}) => {
  const { language, setLanguage, supportedLanguages, isChanging } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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
  const currentLanguage = supportedLanguages.find(l => l.code === language) || {
    code: 'en',
    name: 'English (UK)',
    native_name: 'English',
    flag_emoji: '🇬🇧'
  };

  // Fallback flags if not loaded from DB
  const getFlag = (lang) => {
    if (lang.flag_emoji) return lang.flag_emoji;
    return lang.code === 'pt' ? '🇵🇹' : '🇬🇧';
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
        {supportedLanguages.map(lang => (
          <button
            key={lang.code}
            className={`language-switcher__flag-btn ${language === lang.code ? 'active' : ''}`}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isChanging}
            title={lang.native_name || lang.name}
          >
            <span className="language-switcher__flag">{getFlag(lang)}</span>
          </button>
        ))}
      </div>
    );
  }

  // Inline variant - buttons side by side
  if (variant === 'inline') {
    return (
      <div className={`language-switcher language-switcher--inline ${className}`}>
        {supportedLanguages.map(lang => (
          <button
            key={lang.code}
            className={`language-switcher__btn ${language === lang.code ? 'active' : ''}`}
            onClick={() => handleLanguageChange(lang.code)}
            disabled={isChanging}
          >
            <span className="language-switcher__flag">{getFlag(lang)}</span>
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
        <span className="language-switcher__flag">{getFlag(currentLanguage)}</span>
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
          {supportedLanguages.map(lang => (
            <li key={lang.code}>
              <button
                className={`language-switcher__option ${language === lang.code ? 'active' : ''}`}
                onClick={() => handleLanguageChange(lang.code)}
                role="option"
                aria-selected={language === lang.code}
              >
                <span className="language-switcher__flag">{getFlag(lang)}</span>
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
