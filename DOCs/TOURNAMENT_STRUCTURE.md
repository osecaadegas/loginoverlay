# Tournament System - File Organization

## Component Structure

### Tournament Manager (Setup)
**Location**: `src/components/TournamentPanel/`
- `TournamentPanel.jsx` - Compact setup interface (450px × 550px)
- `TournamentPanel.css` - Styling for setup panel

**Purpose**: Small manager panel for configuring tournament settings
- Tournament size selection (4/8/16/32 players)
- Format selection (Single/Double elimination)
- Participant entry (player name + slot name)
- Quick actions (Fill Random, Clear, Validate)
- Start Tournament button

### Tournament Bracket (Display)
**Location**: `src/components/TournamentBracket/`
- `TournamentBracket.jsx` - Phase-based bracket display component
- `TournamentBracket.css` - Match card grid styling
- `TournamentBracketOverlay.jsx` - Full-screen bracket overlay wrapper
- `TournamentBracketOverlay.css` - Overlay container styling

**Purpose**: Large full-screen display showing active tournament
- Phase-by-phase progression (Quarters → Semis → Finals)
- Grid-based match display (responsive columns)
- Click-to-select winner for each match
- Advance round button (enabled when all matches complete)
- Winner celebration screen
- Reset tournament option

## Workflow

1. **Setup Phase**
   - User opens compact Tournament Manager (450px panel)
   - Fills in participants (or uses "Fill Random")
   - Validates setup
   - Clicks "Start Bracket"

2. **Bracket Phase**
   - Tournament Manager closes
   - Full-screen Bracket Overlay opens (95% screen, max 1400px)
   - Shows current phase matches in modern grid
   - User clicks winner for each slot vs slot match
   - Progress indicator shows completed matches
   - Advance button becomes enabled when phase complete

3. **Progression**
   - Each phase displays independently (no scrolling through all rounds)
   - Quarter-Finals → Semi-Finals → Final
   - Clean transition between phases
   - Winner celebration with crown animation

4. **Completion**
   - Winner announcement screen
   - Option to start new tournament
   - Returns to setup phase

## Design System

### Tournament Manager
- **Size**: 450px wide × 550px max height
- **Style**: Glass morphism with cyan accents
- **Elements**: Compact inputs (0.75rem font, 0.45rem padding)
- **Grid**: 26px numbers, flexible name/slot inputs

### Bracket Display
- **Size**: Full screen (95% width, 90vh height, max 1400px)
- **Layout**: Responsive grid (auto-fit, 280px min)
- **Match Cards**: 
  - Glass morphism background
  - Cyan borders (0.2 → 0.4 on hover)
  - Slot name + game name for each player
  - Crown icon for winner
  - VS separator
  - Hover lift effect (translateY(-4px))

### Color Scheme
- Primary: Cyan (#00e1ff) - borders, accents, winner glow
- Secondary: Purple (#9147ff, #a855f7) - gradients, buttons
- Background: Dark blue gradients (rgba(26, 27, 46), rgba(22, 33, 62))
- Winner: Gold crown emoji with bounce animation
- Reset: Red theme (rgba(255, 71, 87))

## File Organization Checklist
✅ Separated setup panel from bracket display
✅ Compact manager (450px) vs full-screen bracket
✅ Clean component structure with dedicated folders
✅ Phase-based progression (one round at a time)
✅ Modern grid layout for matches
✅ Organized imports and dependencies
✅ CSS separated by component responsibility

## Key Features
- **Compact Setup**: Small, focused configuration panel
- **Phase Display**: One tournament phase visible at a time
- **Grid Layout**: Responsive columns (1-3 depending on screen size)
- **Slot vs Slot**: Each match shows player + slot game name
- **Winner Selection**: Click to select, visual feedback
- **Progress Tracking**: Match completion counter
- **Celebration**: Animated winner announcement
- **Clean Reset**: Easy restart without clutter
