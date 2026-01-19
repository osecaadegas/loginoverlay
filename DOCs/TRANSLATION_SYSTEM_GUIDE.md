# Translation System Setup Guide

This guide explains how to set up and use the multi-language translation system with Azure Translator.

## Overview

The translation system supports:
- **English (EN)** - Primary/default language
- **Portuguese (PT)** - Secondary language

## Architecture

```
┌─────────────────────┐
│   React Components  │
│   (useTranslation)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  LanguageContext    │
│  (State Management) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  azureTranslator.js │
│  (API Utility)      │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────────────┐
│ Supabase│ │Azure Translator │
│ (Cache) │ │ (API)           │
└─────────┘ └─────────────────┘
```

## Step 1: Database Setup

Run the migration to create the translations tables:

```bash
# In Supabase SQL Editor, run:
migrations/add_translation_system.sql
```

This creates:
- `translations` - Cached translations
- `supported_languages` - Language configuration
- Helper functions for translation lookup

## Step 2: Azure Translator Setup

### Create Azure Translator Resource

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **Translator** resource (Cognitive Services)
3. Select the **Free tier (F0)** - 2 million characters/month free
4. Note your **Key** and **Region**

### Add Environment Variables

Add to your `.env` file:

```env
# Azure Translator Configuration
VITE_AZURE_TRANSLATOR_KEY=your_translator_key_here
VITE_AZURE_TRANSLATOR_REGION=westeurope
```

**Important**: Never commit these keys to git!

## Step 3: How to Use

### Static UI Translations (Pre-defined)

Use the `useTranslation` hook for static text:

```jsx
import { useTranslation, T } from '../hooks/useTranslation';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <button>{t(T.ACTION_BUY, 'Buy')}</button>
  );
}
```

The `t()` function:
- First argument: Translation key from `T` constants
- Second argument: Fallback text (English)
- Returns translated text if available, otherwise fallback

### Adding New Static Translations

1. Add the key to `T` object in `src/hooks/useTranslation.js`:
```javascript
export const T = {
  // ... existing keys
  MY_NEW_KEY: 'my_new_key',
};
```

2. Add the translation in the database migration or directly in Supabase:
```sql
INSERT INTO translations (source_table, source_id, source_field, language_code, original_text, translated_text, is_verified)
VALUES ('ui', NULL, 'my_new_key', 'pt', 'My English Text', 'Meu Texto em Português', true);
```

### Dynamic Translations (Auto-translate)

For user-generated or database content:

```jsx
import { useDynamicTranslation } from '../hooks/useTranslation';

function CrimesList({ crimes }) {
  const items = crimes.map(c => ({
    text: c.name,
    sourceTable: 'the_life_robberies',
    sourceId: c.id,
    sourceField: 'name'
  }));
  
  const { getTranslation, isLoading } = useDynamicTranslation(items);
  
  return (
    <ul>
      {crimes.map(crime => (
        <li key={crime.id}>{getTranslation(crime.name)}</li>
      ))}
    </ul>
  );
}
```

### Language Switcher Component

Add the language switcher to any component:

```jsx
import LanguageSwitcher from '../components/LanguageSwitcher';

// Dropdown style (default)
<LanguageSwitcher />

// Inline buttons
<LanguageSwitcher variant="inline" />

// Compact (just flags)
<LanguageSwitcher variant="compact" />
```

## Pre-defined Translation Keys

### Navigation
| Key | English | Portuguese |
|-----|---------|------------|
| `nav_home` | Home | Início |
| `nav_games` | Games | Jogos |
| `nav_offers` | Offers | Ofertas |
| `nav_profile` | Profile | Perfil |
| `nav_settings` | Settings | Configurações |
| `nav_logout` | Logout | Sair |
| `nav_login` | Login | Entrar |

### The Life Game
| Key | English | Portuguese |
|-----|---------|------------|
| `thelife_crimes` | Crimes | Crimes |
| `thelife_pvp` | PVP | PVP |
| `thelife_businesses` | Businesses | Negócios |
| `thelife_brothel` | Brothel | Bordel |
| `thelife_bank` | Bank | Banco |
| `thelife_jail` | Jail | Prisão |
| `thelife_hospital` | Hospital | Hospital |
| `thelife_market` | Black Market | Mercado Negro |
| `thelife_docks` | Docks | Docas |
| `thelife_inventory` | Inventory | Inventário |
| `thelife_leaderboard` | Leaderboard | Classificação |
| `thelife_profile` | Profile | Perfil |
| `thelife_skills` | Skills | Habilidades |
| `thelife_highstakes` | High Stakes | Apostas Altas |
| `thelife_news` | News | Notícias |
| `thelife_syndicate` | The Syndicate | O Sindicato |

### Actions
| Key | English | Portuguese |
|-----|---------|------------|
| `action_buy` | Buy | Comprar |
| `action_sell` | Sell | Vender |
| `action_attack` | Attack | Atacar |
| `action_confirm` | Confirm | Confirmar |
| `action_cancel` | Cancel | Cancelar |
| `action_back` | Back | Voltar |
| `action_save` | Save | Salvar |
| `action_refresh` | Refresh | Atualizar |

### Labels
| Key | English | Portuguese |
|-----|---------|------------|
| `label_level` | Level | Nível |
| `label_cash` | Cash | Dinheiro |
| `label_health` | Health | Vida |
| `label_stamina` | Stamina | Energia |
| `label_loading` | Loading... | Carregando... |

## Adding a New Language

1. Add to `supported_languages` table:
```sql
INSERT INTO supported_languages (code, name, native_name, flag_emoji, is_active, display_order)
VALUES ('es', 'Spanish', 'Español', '🇪🇸', true, 3);
```

2. Add translations for all existing keys:
```sql
INSERT INTO translations (source_table, source_id, source_field, language_code, original_text, translated_text)
SELECT source_table, source_id, source_field, 'es', original_text, original_text -- Will be auto-translated
FROM translations
WHERE language_code = 'pt';
```

3. Run auto-translation or manually add Spanish translations.

## Cost Estimation

Azure Translator Free Tier:
- **2 million characters/month** free
- Enough for most small-medium sites

Typical usage:
- Average UI string: ~20 characters
- 100 unique UI strings × 20 chars = 2,000 chars one-time
- Dynamic content translated on-demand and cached

## Troubleshooting

### Translations not appearing
1. Check if `VITE_AZURE_TRANSLATOR_KEY` is set
2. Verify the migration was run
3. Check browser console for errors

### Azure API errors
1. Verify your key and region are correct
2. Check Azure Portal for quota usage
3. Ensure the resource is in "Running" state

### Cache issues
1. Clear browser localStorage
2. Delete cached translations from database if needed:
```sql
DELETE FROM translations WHERE is_auto_translated = true AND source_table = 'problematic_table';
```

## Files Reference

| File | Purpose |
|------|---------|
| `src/utils/azureTranslator.js` | Azure API integration |
| `src/contexts/LanguageContext.jsx` | React context for language state |
| `src/hooks/useTranslation.js` | Translation hooks |
| `src/components/LanguageSwitcher.jsx` | Language toggle UI |
| `src/components/LanguageSwitcher.css` | Switcher styles |
| `migrations/add_translation_system.sql` | Database schema |
