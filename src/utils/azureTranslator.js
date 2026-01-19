/**
 * Azure Translator API Utility
 * 
 * Uses Azure Cognitive Services Translator API
 * Free tier: 2 million characters per month
 * 
 * Documentation: https://learn.microsoft.com/en-us/azure/cognitive-services/translator/
 */

import { supabase } from '../config/supabaseClient';

// Azure Translator Configuration
const AZURE_TRANSLATOR_KEY = import.meta.env.VITE_AZURE_TRANSLATOR_KEY;
const AZURE_TRANSLATOR_REGION = import.meta.env.VITE_AZURE_TRANSLATOR_REGION || 'westeurope';
const AZURE_TRANSLATOR_ENDPOINT = 'https://api.cognitive.microsofttranslator.com';

// Supported languages
export const LANGUAGES = {
  en: { code: 'en', name: 'English (UK)', nativeName: 'English', flag: '🇬🇧' },
  pt: { code: 'pt', name: 'Portuguese (PT)', nativeName: 'Português', flag: '🇵🇹' }
};

// Default/Primary language
export const DEFAULT_LANGUAGE = 'en';

/**
 * Check if Azure Translator is configured
 */
export const isTranslatorConfigured = () => {
  return !!AZURE_TRANSLATOR_KEY;
};

/**
 * Translate text using Azure Translator API
 * @param {string|string[]} text - Text or array of texts to translate
 * @param {string} from - Source language code (e.g., 'en')
 * @param {string} to - Target language code (e.g., 'pt')
 * @returns {Promise<Object>} Translation result
 */
export const translateText = async (text, from = 'en', to = 'pt') => {
  if (!AZURE_TRANSLATOR_KEY) {
    console.warn('Azure Translator not configured. Set VITE_AZURE_TRANSLATOR_KEY in your .env file');
    return { success: false, error: 'Translator not configured', translations: [] };
  }

  // If same language, return original
  if (from === to) {
    const texts = Array.isArray(text) ? text : [text];
    return {
      success: true,
      translations: texts.map(t => ({ original: t, translated: t }))
    };
  }

  try {
    const texts = Array.isArray(text) ? text : [text];
    const body = texts.map(t => ({ Text: t }));

    const response = await fetch(
      `${AZURE_TRANSLATOR_ENDPOINT}/translate?api-version=3.0&from=${from}&to=${to}`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_TRANSLATOR_KEY,
          'Ocp-Apim-Subscription-Region': AZURE_TRANSLATOR_REGION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Azure Translator error:', error);
      return { success: false, error: `Translation failed: ${response.status}`, translations: [] };
    }

    const data = await response.json();
    
    return {
      success: true,
      translations: texts.map((original, index) => ({
        original,
        translated: data[index]?.translations[0]?.text || original
      }))
    };
  } catch (error) {
    console.error('Translation error:', error);
    return { success: false, error: error.message, translations: [] };
  }
};

/**
 * Translate and cache in database
 * @param {string} text - Text to translate
 * @param {string} sourceTable - Source table name for caching
 * @param {string} sourceId - Source record ID (can be null for UI strings)
 * @param {string} sourceField - Source field name
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<string>} Translated text
 */
export const translateAndCache = async (
  text,
  sourceTable,
  sourceId,
  sourceField,
  targetLanguage
) => {
  if (!text || targetLanguage === DEFAULT_LANGUAGE) {
    return text;
  }

  try {
    // First check if we have a cached translation
    const { data: cached } = await supabase
      .from('translations')
      .select('translated_text')
      .eq('source_table', sourceTable)
      .eq('source_field', sourceField)
      .eq('language_code', targetLanguage)
      .is('source_id', sourceId || null)
      .single();

    if (cached?.translated_text) {
      return cached.translated_text;
    }

    // If no cache and translator not configured, return original
    if (!isTranslatorConfigured()) {
      return text;
    }

    // Translate using Azure
    const result = await translateText(text, DEFAULT_LANGUAGE, targetLanguage);
    
    if (result.success && result.translations[0]?.translated) {
      const translatedText = result.translations[0].translated;
      
      // Cache the translation
      await supabase.from('translations').upsert({
        source_table: sourceTable,
        source_id: sourceId,
        source_field: sourceField,
        language_code: targetLanguage,
        original_text: text,
        translated_text: translatedText,
        is_auto_translated: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'source_table,source_id,source_field,language_code'
      });

      return translatedText;
    }

    return text;
  } catch (error) {
    console.error('translateAndCache error:', error);
    return text;
  }
};

/**
 * Batch translate multiple texts
 * @param {Array<{text: string, sourceTable: string, sourceId?: string, sourceField: string}>} items
 * @param {string} targetLanguage
 * @returns {Promise<Map<string, string>>} Map of original text to translated text
 */
export const batchTranslate = async (items, targetLanguage) => {
  const results = new Map();
  
  if (targetLanguage === DEFAULT_LANGUAGE || !items.length) {
    items.forEach(item => results.set(item.text, item.text));
    return results;
  }

  try {
    // Check cache for all items
    const cacheKeys = items.map(item => ({
      source_table: item.sourceTable,
      source_id: item.sourceId || null,
      source_field: item.sourceField
    }));

    const { data: cachedTranslations } = await supabase
      .from('translations')
      .select('source_table, source_id, source_field, original_text, translated_text')
      .eq('language_code', targetLanguage);

    // Build cache lookup
    const cacheMap = new Map();
    cachedTranslations?.forEach(t => {
      const key = `${t.source_table}|${t.source_id || 'null'}|${t.source_field}`;
      cacheMap.set(key, t.translated_text);
    });

    // Separate cached and uncached items
    const uncachedItems = [];
    items.forEach(item => {
      const key = `${item.sourceTable}|${item.sourceId || 'null'}|${item.sourceField}`;
      if (cacheMap.has(key)) {
        results.set(item.text, cacheMap.get(key));
      } else {
        uncachedItems.push(item);
      }
    });

    // If translator not configured or no uncached items, return
    if (!isTranslatorConfigured() || uncachedItems.length === 0) {
      uncachedItems.forEach(item => results.set(item.text, item.text));
      return results;
    }

    // Batch translate uncached items (max 100 per request)
    const batchSize = 100;
    for (let i = 0; i < uncachedItems.length; i += batchSize) {
      const batch = uncachedItems.slice(i, i + batchSize);
      const texts = batch.map(item => item.text);
      
      const translationResult = await translateText(texts, DEFAULT_LANGUAGE, targetLanguage);
      
      if (translationResult.success) {
        // Cache and store results
        const upsertData = [];
        
        translationResult.translations.forEach((t, index) => {
          const item = batch[index];
          results.set(item.text, t.translated);
          
          upsertData.push({
            source_table: item.sourceTable,
            source_id: item.sourceId,
            source_field: item.sourceField,
            language_code: targetLanguage,
            original_text: t.original,
            translated_text: t.translated,
            is_auto_translated: true,
            updated_at: new Date().toISOString()
          });
        });

        // Batch upsert translations
        if (upsertData.length > 0) {
          await supabase.from('translations').upsert(upsertData, {
            onConflict: 'source_table,source_id,source_field,language_code'
          });
        }
      } else {
        // On failure, use original text
        batch.forEach(item => results.set(item.text, item.text));
      }
    }

    return results;
  } catch (error) {
    console.error('batchTranslate error:', error);
    items.forEach(item => results.set(item.text, item.text));
    return results;
  }
};

/**
 * Get UI translation from database
 * @param {string} key - Translation key (e.g., 'nav_home')
 * @param {string} language - Target language
 * @param {string} fallback - Fallback text if no translation found
 * @returns {Promise<string>} Translated text
 */
export const getUITranslation = async (key, language, fallback = '') => {
  if (language === DEFAULT_LANGUAGE) {
    return fallback;
  }

  try {
    const { data } = await supabase
      .from('translations')
      .select('translated_text')
      .eq('source_table', 'ui')
      .is('source_id', null)
      .eq('source_field', key)
      .eq('language_code', language)
      .single();

    return data?.translated_text || fallback;
  } catch {
    return fallback;
  }
};

/**
 * Load all UI translations for a language
 * @param {string} language - Target language code
 * @returns {Promise<Object>} Object with translation keys and values
 */
export const loadUITranslations = async (language) => {
  if (language === DEFAULT_LANGUAGE) {
    return {};
  }

  try {
    const { data } = await supabase
      .from('translations')
      .select('source_field, translated_text')
      .eq('source_table', 'ui')
      .is('source_id', null)
      .eq('language_code', language);

    const translations = {};
    data?.forEach(t => {
      translations[t.source_field] = t.translated_text;
    });

    return translations;
  } catch (error) {
    console.error('loadUITranslations error:', error);
    return {};
  }
};

/**
 * Get supported languages from database
 * @returns {Promise<Array>} Array of supported languages
 */
export const getSupportedLanguages = async () => {
  try {
    const { data } = await supabase
      .from('supported_languages')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    return data || Object.values(LANGUAGES);
  } catch {
    return Object.values(LANGUAGES);
  }
};

export default {
  translateText,
  translateAndCache,
  batchTranslate,
  getUITranslation,
  loadUITranslations,
  getSupportedLanguages,
  isTranslatorConfigured,
  LANGUAGES,
  DEFAULT_LANGUAGE
};
