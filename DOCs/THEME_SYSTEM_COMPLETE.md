# Theme & Material Design System - Complete Documentation

## Overview

Production-grade theming system for OBS overlay platform with:
- Global design tokens
- 6 material presets (matte, glass, metallic, anodized, carbon, neon)
- Per-widget customization
- Real-time Supabase sync
- GPU-safe performance
- Zero-refresh updates in OBS

---

## Architecture

### 1. Database Schema (`add_theme_system.sql`)

**Tables Created:**

#### `theme_presets`
- Pre-built themes (Default Dark, Neon Cyberpunk, Carbon Pro, Ice Glass, Gold Metallic)
- Global design tokens
- Material definitions
- Animation settings

#### `user_themes`
- User's active theme
- Extends theme_presets with custom overrides
- One theme per overlay
- Real-time synced

#### `widget_theme_overrides`
- Per-widget customization
- Inherits from user_theme by default
- Optional overrides for colors, material, effects

#### `material_definitions`
- Material presets with CSS properties
- Surface, gradient, shadow, border, glow styles
- Stored as JSONB for flexibility

**Key Features:**
- RLS policies for security
- Realtime triggers
- Premium theme enforcement
- Default theme seeding

---

### 2. CSS Variable System (`theme-system.css`)

**Design Token Categories:**

#### Color Tokens
```css
--color-primary: #667eea
--color-secondary: #764ba2
--color-accent: #00d4ff
--color-surface: rgba(30, 30, 40, 0.9)
--color-text-primary: #ffffff
--color-text-secondary: rgba(255, 255, 255, 0.7)
--color-success: #4caf50
--color-danger: #ff6b6b
--color-warning: #ffc107
--color-glow: #667eea
--color-shadow: rgba(0, 0, 0, 0.5)
```

#### RGB Values (for alpha transparency)
```css
--primary-rgb: 102, 126, 234
--secondary-rgb: 118, 75, 162
--accent-rgb: 0, 212, 255
--glow-rgb: 102, 126, 234
```

#### Typography Tokens
```css
--font-family: 'Inter', sans-serif
--font-weight-normal: 400
--font-weight-bold: 600
--font-numeric: 'Roboto Mono', monospace
--letter-spacing: 0
```

#### Visual Effect Tokens
```css
--border-radius: 12px
--glow-intensity: 0.5
--shadow-depth: 1
--backdrop-blur: 10
--animation-duration: 300ms
--animation-intensity: 1
```

**Material Data Attributes:**
- `[data-material="matte"]`
- `[data-material="metallic"]`
- `[data-material="anodized"]`
- `[data-material="glass"]`
- `[data-material="carbon"]`
- `[data-material="neon"]`

**Animation Data Attributes:**
- `[data-animation="off"]` - No animations
- `[data-animation="subtle"]` - 200ms, 0.5x intensity
- `[data-animation="standard"]` - 300ms, 1x intensity
- `[data-animation="impactful"]` - 500ms, 1.5x intensity

---

### 3. Material Definitions

#### Matte
- **Style:** Flat surface, soft shadows
- **Use Case:** Clean, professional look
- **Performance:** Excellent (no blur/filters)
- **CSS:** Simple box-shadow, solid background

#### Glass
- **Style:** Frosted glass with backdrop blur
- **Use Case:** Modern, translucent aesthetic
- **Performance:** Good (backdrop-filter is GPU-accelerated)
- **CSS:** `backdrop-filter: blur(10px)`, subtle border

#### Metallic
- **Style:** Brushed metal with highlights
- **Use Case:** Premium, luxurious feel
- **Performance:** Excellent (gradients + inset shadows)
- **CSS:** Linear gradient, inset highlights/shadows

#### Anodized
- **Style:** Colored aluminum finish
- **Use Case:** Technical, industrial look
- **Performance:** Excellent (gradient + inset shadows)
- **CSS:** Vertical gradient, inset lighting effects

#### Carbon Fiber
- **Style:** Technical carbon pattern
- **Use Case:** Gaming, performance aesthetic
- **Performance:** Good (radial gradient pattern)
- **CSS:** Radial gradient overlay with `::before` pseudo-element

#### Neon
- **Style:** High-glow emissive
- **Use Case:** Cyberpunk, attention-grabbing
- **Performance:** Good (multiple box-shadows)
- **CSS:** Stacked glow shadows, emissive borders

---

### 4. Theme Manager Utility (`themeManager.js`)

**Key Functions:**

#### `applyTheme(theme)`
Applies theme object to document root
- Sets all CSS variables
- Updates data attributes
- Converts hex to RGB for alpha channels
- Immediate visual update

#### `applyWidgetOverride(widgetElement, overrides)`
Applies widget-specific customizations
- Sets widget-scoped CSS variables
- Overrides global theme
- Maintains inheritance for unset properties

#### `clearWidgetOverride(widgetElement)`
Resets widget to inherit global theme
- Removes override attributes
- Clears custom CSS properties

#### `getCurrentTheme()`
Reads current theme from document root
- Returns computed values
- Useful for debugging/preview

#### `hexToRgb(hex)`
Converts hex colors to RGB values
- Required for rgba() transparency
- Caches computed values

#### `getContrastRatio(color1, color2)`
Calculates WCAG contrast ratio
- Ensures readability
- Accessibility compliance

---

### 5. Theme Studio UI

**Components:**

#### `ThemeStudio.jsx`
- Main orchestrator
- Loads theme data from Supabase
- Real-time save/load
- Preview mode toggle
- Preset management

#### `MaterialSelector.jsx`
- Grid of 6 material cards
- Visual icons for each material
- Intensity slider (0-2x)
- Instant preview

#### `ColorTokenEditor.jsx`
- Color picker + hex input
- 7 key color tokens
- Real-time preview
- Contrast warnings

#### `VisualEffectsEditor.jsx`
- Border radius slider
- Glow intensity slider
- Shadow depth slider
- Animation mode select
- High contrast toggle

#### `TypographyEditor.jsx`
- Font family dropdown
- Weight sliders (normal/bold)
- Numeric font option
- Letter spacing control

---

## Integration Guide

### Step 1: Run Database Migration

```bash
# In Supabase SQL Editor
# Run: migrations/add_theme_system.sql
```

This creates:
- `theme_presets` table with 5 default themes
- `user_themes` table for customizations
- `widget_theme_overrides` table for per-widget settings
- `material_definitions` table with 6 materials
- RLS policies
- Realtime triggers

### Step 2: Import Theme CSS

```jsx
// In your main App.jsx or index.js
import './styles/theme-system.css';
```

This provides:
- CSS variables
- Material data attributes
- Base widget styles (`.widget-base`)
- Animation presets
- High contrast mode

### Step 3: Apply Theme in Overlay

```jsx
// In OverlayV2.jsx
import { useEffect } from 'react';
import { supabase } from './config/supabaseClient';
import { applyTheme } from './utils/themeManager';

function OverlayV2() {
  useEffect(() => {
    // Load theme
    const loadTheme = async () => {
      const { data } = await supabase
        .from('user_themes')
        .select('*')
        .eq('overlay_id', overlayId)
        .eq('is_active', true)
        .single();
      
      if (data) applyTheme(data);
    };
    
    loadTheme();
    
    // Subscribe to theme changes
    const channel = supabase
      .channel(`theme_${overlayId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_themes',
        filter: `overlay_id=eq.${overlayId}`
      }, (payload) => {
        applyTheme(payload.new);
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [overlayId]);
  
  return (
    <div className="overlay-container">
      {/* Widgets render here */}
    </div>
  );
}
```

### Step 4: Apply Base Class to Widgets

```jsx
// In any widget component
function MyWidget({ config, data }) {
  return (
    <div className="widget-base" data-material={config.material}>
      <h3 className="widget-numeric">$1,234.56</h3>
      <p>Widget content</p>
    </div>
  );
}
```

### Step 5: Add Theme Tab to Dashboard

Already integrated in `ThemesTab.jsx`:

```jsx
import ThemeStudio from '../ThemeStudio/ThemeStudio';

export default function ThemesTab({ overlay }) {
  return overlay ? <ThemeStudio overlayId={overlay.id} /> : null;
}
```

---

## Usage Examples

### Example 1: Create Custom Theme

```javascript
const customTheme = {
  user_id: userId,
  overlay_id: overlayId,
  color_primary: '#ff00ff',
  color_secondary: '#00ffff',
  material_type: 'neon',
  glow_intensity: 1.8,
  animation_intensity: 'impactful'
};

const { data } = await supabase
  .from('user_themes')
  .insert([customTheme]);
```

### Example 2: Override Single Widget

```javascript
const widgetOverride = {
  widget_id: widgetId,
  override_color_primary: '#ff6b6b',
  override_material_type: 'glass',
  override_glow_intensity: 2.0
};

await supabase
  .from('widget_theme_overrides')
  .insert([widgetOverride]);
```

### Example 3: Load Preset

```javascript
const { data: preset } = await supabase
  .from('theme_presets')
  .select('*')
  .eq('name', 'Neon Cyberpunk')
  .single();

await supabase
  .from('user_themes')
  .update({ ...preset, theme_preset_id: preset.id })
  .eq('id', userThemeId);
```

---

## Performance Considerations

### GPU-Safe Properties
✅ **Safe (uses GPU):**
- `transform`
- `opacity`
- `filter` (limited use)
- `backdrop-filter` (modern browsers)

❌ **Avoid (CPU-bound):**
- `width/height` animations
- `margin/padding` animations
- Excessive `box-shadow` changes

### Best Practices

1. **Use CSS Variables**
   - Change once, update everywhere
   - No DOM manipulation
   - Hardware-accelerated

2. **Limit Repaints**
   - Batch theme changes
   - Use `will-change` sparingly
   - Avoid layout thrashing

3. **Optimize Materials**
   - Glass: Limit blur radius (10-20px)
   - Carbon: Use small background-size
   - Neon: Limit stacked shadows (3-4 max)

4. **Animation Budget**
   - Max 60 FPS target
   - Use `requestAnimationFrame`
   - Respect `prefers-reduced-motion`

### OBS Performance
- Target: 1920x1080 @ 60 FPS
- Browser Source FPS: 30-60
- CPU Usage: <5% per source
- Memory: <100MB per overlay

---

## Accessibility

### WCAG Compliance

#### Contrast Ratios
- **Text on Primary:** Minimum 4.5:1
- **Large Text:** Minimum 3:1
- **UI Components:** Minimum 3:1

#### High Contrast Mode
Activated via `high_contrast: true`:
- Increases text contrast
- Reduces transparency
- Simplifies borders
- Removes decorative effects

### Reduced Motion
Respects `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Troubleshooting

### Issue: Theme Not Applying
**Solution:**
1. Check theme is `is_active: true`
2. Verify `overlay_id` matches
3. Confirm realtime subscription active
4. Check browser console for errors

### Issue: Colors Not Updating
**Solution:**
1. Verify hex format (`#RRGGBB`)
2. Check CSS variable names match
3. Clear browser cache
4. Reload OBS browser source

### Issue: Material Not Showing
**Solution:**
1. Confirm `data-material` attribute set
2. Check CSS import order
3. Verify material exists in definitions
4. Test in different browser

### Issue: Performance Lag
**Solution:**
1. Reduce `backdrop_blur` value
2. Limit simultaneous animations
3. Set `animation_intensity: "subtle"`
4. Disable unused materials

---

## Future Enhancements

### Planned Features
- [ ] Gradient editor (angle, stops)
- [ ] Animation timeline editor
- [ ] Custom font uploads
- [ ] Theme marketplace
- [ ] A/B testing presets
- [ ] Auto dark/light mode
- [ ] Theme versioning
- [ ] Export/import themes

### Experimental
- [ ] 3D transforms (carefully)
- [ ] CSS Houdini (when stable)
- [ ] WebGL shaders (opt-in)
- [ ] Particle effects

---

## Support & Resources

### Documentation
- Material Design: https://m3.material.io
- CSS Variables: https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
- Backdrop Filter: https://caniuse.com/css-backdrop-filter

### Tools
- Color Contrast Checker: https://webaim.org/resources/contrastchecker/
- Hex to RGB Converter: Built-in (`themeManager.js`)
- Theme Validator: Coming soon

---

## Summary

**What Was Built:**
- ✅ Database schema (4 tables, RLS, realtime)
- ✅ CSS variable architecture (40+ tokens)
- ✅ 6 production materials (GPU-safe)
- ✅ Theme manager utility (JS)
- ✅ Theme Studio UI (5 components)
- ✅ Real-time Supabase sync
- ✅ Per-widget overrides
- ✅ Premium enforcement
- ✅ Accessibility features
- ✅ Performance optimization

**Production Ready:**
- Zero-refresh OBS updates
- 60 FPS target
- WCAG AA compliant
- Mobile responsive
- Premium SaaS quality

**Deployed:**
- Live at: https://www.osecaadegas.pt
- Themes tab: Active
- Widgets tab: Integrated
- Database: Migrated
- Real-time: Active

---

*Last Updated: January 11, 2026*
*Version: 1.0.0*
*Status: Production*
