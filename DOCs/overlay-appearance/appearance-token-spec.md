# Appearance Token Specification

This specification is proposed from the actual audited widget system. It is not a production runtime file yet.

## Global design tokens

| Token | Purpose | Notes |
| --- | --- | --- |
| `primaryColor` | Main brand/accent color | Already overlaps with legacy `accentColor`. |
| `accentColor` | Secondary highlight | Must be generated from primary when unset. |
| `textColor` | Primary readable text | Must pass contrast validation. |
| `mutedTextColor` | Secondary labels | Must not be too transparent in OBS. |
| `positiveColor` | Profit/winner/success | Used by stats and bets states. |
| `negativeColor` | Loss/denied/error | Used by stats and bets states. |
| `warningColor` | Stop loss/attention | Used by bonus hunt and warnings. |
| `surfaceColor` | Main background surface | Must map to widget-specific backgrounds. |
| `surfaceSecondary` | Cards/secondary panels | Often currently `cardBg`. |
| `borderColor` | Borders/dividers | Needs opacity-safe handling. |
| `shadowColor` | Drop and internal shadows | Slot-level and internal shadows differ. |
| `glowColor` | Neon/glow effects | Must be capped to avoid blurry text. |

## Material tokens

| Token | Purpose |
| --- | --- |
| `surfaceOpacity` | Main surface opacity. |
| `highlightOpacity` | Top highlights and reflective bands. |
| `borderIntensity` | Border opacity/brightness. |
| `reflectionIntensity` | Metallic/glass reflective effect. |
| `blurStrength` | Backdrop or simulated blur. |
| `shadowStrength` | Shadow intensity multiplier. |
| `glowStrength` | Glow intensity multiplier. |
| `gradientDirection` | Direction for gradient-capable widgets. |
| `gradientStops` | Safe gradient stop list. |

## Typography tokens

| Token | Purpose |
| --- | --- |
| `headerFont` | Titles and major headings. |
| `bodyFont` | Main copy/body text. |
| `labelFont` | Small labels. |
| `valueFont` | Numbers and values. |
| `headerSize` | Header text size. |
| `bodySize` | Body text size. |
| `labelSize` | Label text size. |
| `valueSize` | Numeric value size. |
| `fontWeightNormal` | Default body weight. |
| `fontWeightStrong` | Important values/titles. |
| `lineHeight` | Text line height, constrained per widget. |

## Shape tokens

| Token | Safe general range |
| --- | --- |
| `rootRadius` | 0px to 32px, widget-specific clamp required. |
| `cardRadius` | 0px to 24px. |
| `badgeRadius` | 0px to 999px. |
| `borderWidth` | 0px to 4px for most widgets. |
| `dividerWidth` | 0px to 2px. |

## Spacing tokens

| Token | Safe general range |
| --- | --- |
| `rootPadding` | 0px to 48px, not safe for fixed carousels without testing. |
| `cardPadding` | 4px to 32px. |
| `sectionGap` | 4px to 32px. |
| `itemGap` | 2px to 24px. |
| `compactness` | compact, standard, spacious. |

## Animation tokens

Only these animation tokens are broadly safe:

- `motionEnabled`
- `durationMultiplier` in a constrained range of 0.5 to 2.
- `transitionSpeed`
- `glowPulseStrength` for widgets that explicitly declare glow support.

Avoid exposing animation distances, 3D transforms, carousel item widths, or list scroll distances until each widget declares them.
