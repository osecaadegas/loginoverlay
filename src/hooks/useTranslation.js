import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { batchTranslate, DEFAULT_LANGUAGE } from '../utils/azureTranslator';

/**
 * Hook for translating static UI strings
 * Uses pre-loaded translations from the LanguageContext
 * 
 * @example
 * const { t } = useTranslation();
 * return <button>{t('action_buy', 'Buy')}</button>;
 */
export const useTranslation = () => {
  const { t, language, isLoading } = useLanguage();
  
  return {
    t,
    language,
    isLoading
  };
};

/**
 * Hook for translating dynamic content (e.g., database records)
 * Fetches and caches translations using Azure Translator
 * 
 * @param {Array<{text: string, sourceTable: string, sourceId?: string, sourceField: string}>} items - Items to translate
 * @param {Object} options - Options
 * @param {boolean} options.skip - Skip translation
 * 
 * @example
 * const items = crimes.map(c => ({ text: c.name, sourceTable: 'crimes', sourceId: c.id, sourceField: 'name' }));
 * const { translations, isLoading } = useDynamicTranslation(items);
 * // translations.get(crime.name) returns the translated text
 */
export const useDynamicTranslation = (items, options = {}) => {
  const { language } = useLanguage();
  const [translations, setTranslations] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Track previous items to avoid unnecessary re-fetches
  const prevItemsRef = useRef(null);
  const prevLanguageRef = useRef(language);

  useEffect(() => {
    // Skip if requested or no items
    if (options.skip || !items || items.length === 0) {
      setTranslations(new Map(items?.map(i => [i.text, i.text]) || []));
      return;
    }

    // Skip if default language
    if (language === DEFAULT_LANGUAGE) {
      setTranslations(new Map(items.map(i => [i.text, i.text])));
      return;
    }

    // Check if items actually changed (by comparing stringified values)
    const itemsKey = JSON.stringify(items.map(i => `${i.text}|${i.sourceTable}|${i.sourceId}|${i.sourceField}`));
    const languageChanged = language !== prevLanguageRef.current;
    
    if (!languageChanged && itemsKey === prevItemsRef.current) {
      return;
    }

    prevItemsRef.current = itemsKey;
    prevLanguageRef.current = language;

    const fetchTranslations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const translationMap = await batchTranslate(items, language);
        setTranslations(translationMap);
      } catch (err) {
        console.error('Translation fetch error:', err);
        setError(err);
        // Fallback to original text
        setTranslations(new Map(items.map(i => [i.text, i.text])));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslations();
  }, [items, language, options.skip]);

  /**
   * Get translation for a specific text
   */
  const getTranslation = useCallback((text) => {
    return translations.get(text) || text;
  }, [translations]);

  return {
    translations,
    getTranslation,
    isLoading,
    error,
    language
  };
};

/**
 * Hook for translating a single dynamic text
 * Useful for individual fields rather than lists
 * 
 * @param {string} text - Text to translate
 * @param {string} sourceTable - Source table name
 * @param {string} sourceId - Source record ID
 * @param {string} sourceField - Source field name
 * 
 * @example
 * const translatedName = useSingleTranslation(crime.name, 'crimes', crime.id, 'name');
 */
export const useSingleTranslation = (text, sourceTable, sourceId, sourceField) => {
  const { translateDynamic, language } = useLanguage();
  const [translated, setTranslated] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!text || language === DEFAULT_LANGUAGE) {
      setTranslated(text);
      return;
    }

    let mounted = true;
    setIsLoading(true);

    translateDynamic(text, sourceTable, sourceId, sourceField)
      .then(result => {
        if (mounted) {
          setTranslated(result);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [text, sourceTable, sourceId, sourceField, language, translateDynamic]);

  return { translated, isLoading, language };
};

/**
 * Translation keys for common UI elements
 * Use with the t() function
 */
export const T = {
  // Navigation
  NAV_HOME: 'nav_home',
  NAV_GAMES: 'nav_games',
  NAV_OFFERS: 'nav_offers',
  NAV_PROFILE: 'nav_profile',
  NAV_SETTINGS: 'nav_settings',
  NAV_LOGOUT: 'nav_logout',
  NAV_LOGIN: 'nav_login',
  
  // Sidebar Navigation
  NAV_PARTNERS: 'nav_partners',
  NAV_POINTS_STORE: 'nav_points_store',
  NAV_COMMUNITY: 'nav_community',
  NAV_TOURNAMENTS: 'nav_tournaments',
  NAV_GUESS_BALANCE: 'nav_guess_balance',
  NAV_GIVEAWAYS: 'nav_giveaways',
  NAV_VOUCHERS: 'nav_vouchers',
  NAV_DAILY_WHEEL: 'nav_daily_wheel',
  NAV_BLACKJACK: 'nav_blackjack',
  NAV_MINES: 'nav_mines',
  NAV_WEBMOD: 'nav_webmod',
  NAV_SLOT_MANAGER: 'nav_slot_manager',
  NAV_POINTS_MANAGER: 'nav_points_manager',
  NAV_VOUCHER_MANAGER: 'nav_voucher_manager',
  NAV_GIVEAWAY_CREATOR: 'nav_giveaway_creator',
  NAV_EDIT_SLOTS: 'nav_edit_slots',
  NAV_ADMIN_PANEL: 'nav_admin_panel',
  LOGIN_WITH_TWITCH: 'login_with_twitch',
  LOGOUT: 'nav_logout',

  // Actions
  ACTION_BUY: 'action_buy',
  ACTION_SELL: 'action_sell',
  ACTION_ATTACK: 'action_attack',
  ACTION_DEFEND: 'action_defend',
  ACTION_DEPOSIT: 'action_deposit',
  ACTION_WITHDRAW: 'action_withdraw',
  ACTION_HIRE: 'action_hire',
  ACTION_FIRE: 'action_fire',
  ACTION_UPGRADE: 'action_upgrade',
  ACTION_CLAIM: 'action_claim',
  ACTION_CONFIRM: 'action_confirm',
  ACTION_CANCEL: 'action_cancel',
  ACTION_CLOSE: 'action_close',
  ACTION_BACK: 'action_back',
  ACTION_NEXT: 'action_next',
  ACTION_SAVE: 'action_save',
  ACTION_DELETE: 'action_delete',
  ACTION_EDIT: 'action_edit',
  ACTION_REFRESH: 'action_refresh',

  // Labels
  LABEL_LEVEL: 'label_level',
  LABEL_XP: 'label_xp',
  LABEL_CASH: 'label_cash',
  LABEL_BANK: 'label_bank',
  LABEL_HEALTH: 'label_health',
  LABEL_STAMINA: 'label_stamina',
  LABEL_POWER: 'label_power',
  LABEL_DEFENSE: 'label_defense',
  LABEL_INTELLIGENCE: 'label_intelligence',
  LABEL_WINS: 'label_wins',
  LABEL_LOSSES: 'label_losses',
  LABEL_RANK: 'label_rank',
  LABEL_PRICE: 'label_price',
  LABEL_REWARD: 'label_reward',
  LABEL_COST: 'label_cost',
  LABEL_QUANTITY: 'label_quantity',
  LABEL_TOTAL: 'label_total',
  LABEL_SUCCESS: 'label_success',
  LABEL_FAILED: 'label_failed',
  LABEL_LOADING: 'label_loading',

  // Messages
  MSG_SUCCESS: 'msg_success',
  MSG_ERROR: 'msg_error'
};

export default useTranslation;
