import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from "../config/supabaseClient";
import { useAuth } from '../context/AuthContext';
import { 
  loadUITranslations, 
  getSupportedLanguages, 
  translateAndCache,
  DEFAULT_LANGUAGE,
  LANGUAGES 
} from '../utils/azureTranslator';

// Create the context
const LanguageContext = createContext();

// Local storage key
const LANGUAGE_STORAGE_KEY = 'preferred_language';

/**
 * Language Provider Component
 * Wraps the app and provides language state and translation functions
 */
export const LanguageProvider = ({ children }) => {
  const { user } = useAuth();
  const preferenceRevision = useRef(0);
  const [language, setLanguageState] = useState(() => {
    // Initialize from localStorage or default
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE;
    }
    return DEFAULT_LANGUAGE;
  });
  
  const [translations, setTranslations] = useState({});
  const [supportedLanguages, setSupportedLanguages] = useState(Object.values(LANGUAGES));
  const [isLoading, setIsLoading] = useState(true);
  const [isChanging, setIsChanging] = useState(false);

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const [uiTranslations, languages] = await Promise.all([
          loadUITranslations(language),
          getSupportedLanguages()
        ]);
        
        setTranslations(uiTranslations);
        setSupportedLanguages(languages);
      } catch (error) {
        console.error('Failed to load translations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [language]);

  // Sync with user profile if logged in
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const revision = preferenceRevision.current;
    const syncUserLanguage = async () => {
      try {
        // Get user's saved preference
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('preferred_language')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;

        if (!cancelled && revision === preferenceRevision.current && profile?.preferred_language) {
          setLanguageState(profile.preferred_language);
          localStorage.setItem(LANGUAGE_STORAGE_KEY, profile.preferred_language);
        }
      } catch (error) {
        if (!cancelled) console.error('Failed to load language preference:', error);
      }
    };

    syncUserLanguage();
    return () => { cancelled = true; };
  }, [user?.id]);

  /**
   * Change the current language
   */
  const setLanguage = useCallback(async (newLanguage) => {
    if (newLanguage === language || isChanging) return;
    
    setIsChanging(true);
    preferenceRevision.current += 1;
    
    try {
      // Update state and localStorage
      setLanguageState(newLanguage);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);

      // Update user profile if logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('user_profiles')
          .upsert({ user_id: user.id, preferred_language: newLanguage }, { onConflict: 'user_id' });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  }, [language, isChanging]);

  /**
   * Get a UI translation by key
   * Falls back to the English text if no translation found
   */
  const t = useCallback((key, fallback = '') => {
    // If default language, return fallback (original English text)
    if (language === DEFAULT_LANGUAGE) {
      return fallback;
    }
    
    // Look up translation
    return translations[key] || fallback;
  }, [language, translations]);

  /**
   * Translate dynamic text (uses Azure API with caching)
   */
  const translateDynamic = useCallback(async (text, sourceTable, sourceId, sourceField) => {
    if (language === DEFAULT_LANGUAGE || !text) {
      return text;
    }
    
    return translateAndCache(text, sourceTable, sourceId, sourceField, language);
  }, [language]);

  /**
   * Check if current language is RTL (for future language support)
   */
  const isRTL = useCallback(() => {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(language);
  }, [language]);

  const value = {
    // Current language
    language,
    setLanguage,
    
    // Translation functions
    t,
    translateDynamic,
    
    // Available languages
    supportedLanguages,
    
    // State
    isLoading,
    isChanging,
    isRTL,
    
    // Constants
    defaultLanguage: DEFAULT_LANGUAGE
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Hook to use the language context
 */
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return context;
};

export default LanguageContext;
