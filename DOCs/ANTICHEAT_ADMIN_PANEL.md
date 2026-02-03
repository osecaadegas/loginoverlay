# Anti-Cheat Admin Panel

Professional internal dashboard for monitoring and managing the anti-cheat system.

## 🚀 Quick Start

### 1. Run RLS Policies (REQUIRED FIRST)

Before using the admin panel, you MUST run the RLS policies in Supabase:

1. Open Supabase SQL Editor
2. Open `migrations/enable_rls_policies_for_anticheat.sql`
3. Run the entire file
4. Verify no errors

This enables authenticated users to write to the anti-cheat tables.

### 2. Start the Admin Panel

```bash
npm run dev
```

Then open: **http://localhost:5173/admin.html**

This will load the admin panel on a separate page from your main app.

## 📁 File Structure

```
src/components/Admin/
├── layout/
│   ├── AdminLayout.jsx        # Main layout with sidebar + topbar
│   └── AdminLayout.css        # Design system + layout styles
├── components/
│   ├── SeverityBadge.jsx      # Critical/High/Medium/Low/Safe badges
│   ├── StatusBadge.jsx        # Status indicators (online/offline/flagged/etc)
│   ├── MetricCard.jsx         # KPI cards with trends
│   └── DataTable.jsx          # Sortable table with pagination
└── pages/
    ├── DashboardPage.jsx      # Overview with key metrics
    ├── AlertsPage.jsx         # View and filter security alerts
    ├── LogsPage.jsx           # Advanced log filtering + details
    └── PlayersPage.jsx        # Risk leaderboard + player management
```

## 📊 Features

### Dashboard Page
- **Key Metrics**: Active alerts, average risk score, active players, flagged actions
- **Recent Alerts**: Last 5 alerts with severity badges
- **High Risk Players**: Top 5 players by risk score
- **Quick Actions**: Jump to specific filtered views
- **System Status**: Real-time health indicators

### Alerts Page
- Filter by status (new/investigating/resolved/dismissed)
- Filter by severity (critical/high/medium/low)
- Filter by rule type
- Mark all as read
- Export to CSV
- Click row to navigate to investigation

### Logs Page
- Filter by category (economy/inventory/crime/auth/admin)
- Filter by flagged status
- Search by player ID
- Expandable rows showing full details
- JSON metadata viewer
- Copy log data to clipboard
- View old/new values comparison

### Players Page
- Summary metrics (total/high-risk/flagged/banned)
- Risk leaderboard (sorted by score)
- Visual risk score bars (0-100)
- Active alerts count per player
- Join date tracking
- Click row to view investigation

## 🎨 Design System

### Colors
- **Primary**: `#667EEA` (Indigo)
- **Success**: `#10B981` (Green)
- **Warning**: `#F59E0B` (Amber)
- **Danger**: `#DC2626` (Red)
- **Backgrounds**: Dark mode (gray tones)

### Spacing
- Uses 4px grid: `xs(4px)`, `sm(8px)`, `md(12px)`, `lg(16px)`, `xl(24px)`, `2xl(32px)`

### Typography
- **Font**: Inter (system fallback)
- **Sizes**: 11px-32px scale
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

## 🔌 Database Integration

All pages connect to Supabase using:
- `security_alerts` - Alert data
- `game_logs` - Player action logs
- `the_life_players` - Player info + usernames
- `player_risk_scores` - Risk scoring data

### Example Query (Alerts Page)

```javascript
const { data } = await supabase
  .from('security_alerts')
  .select(`
    *,
    player:the_life_players(id, username)
  `)
  .eq('status', 'new')
  .order('created_at', { ascending: false });
```

## 🛠️ Adding New Pages

1. Create page component in `src/components/Admin/pages/`:
```jsx
import React from 'react';
import './MyPage.css';

const MyPage = () => {
  return (
    <div className="my-page">
      <div className="page-header">
        <h1 className="page-title">My Page</h1>
      </div>
    </div>
  );
};

export default MyPage;
```

2. Add route in `src/AdminRoutes.jsx`:
```jsx
import MyPage from './components/Admin/pages/MyPage';

<Route path="my-page" element={<MyPage />} />
```

3. Add navigation link in `src/components/Admin/layout/AdminLayout.jsx`:
```jsx
{ 
  path: '/admin/my-page', 
  icon: Star, 
  label: 'My Page' 
}
```

## 🚧 Upcoming Features

- **Investigation Page**: 3-panel layout with timeline, economy charts, inventory
- **Rules Manager**: Enable/disable rules, adjust thresholds
- **Settings Page**: Configure alert thresholds, notification preferences
- **Documentation Page**: Help guides for using the admin panel

## 📝 Notes

- All times display relative ("2m ago", "1h ago")
- Tables support sorting on most columns
- Click any row to navigate to related pages
- Empty states show when no data exists
- Loading skeletons during data fetches
- Fully responsive (mobile breakpoint: 768px)

## 🔑 Keyboard Shortcuts

- `Cmd/Ctrl + K`: Open search modal
- `Esc`: Close search modal

## 🎯 Admin Access

Currently, the admin panel is open to all authenticated users. To add role-based access:

1. Add `is_admin` column to `the_life_players` table
2. Update RLS policies to check admin status
3. Add middleware in `AdminRoutes.jsx` to verify permissions

## 📦 Dependencies

- **React Router DOM**: v7.10.1 (routing)
- **Supabase JS**: Database client
- **Lucide React**: Icons
- **React**: v18+

## 🐛 Troubleshooting

### "Infinite loading on site"
**Solution**: Run `enable_rls_policies_for_anticheat.sql` in Supabase

### "No data showing"
**Solution**: Ensure anti-cheat logging is active in your game code

### "Page not found"
**Solution**: Make sure you're accessing `/admin.html` not `/index.html`

### "Can't see admin panel"
**Solution**: Navigate to `http://localhost:5173/admin.html`

---

**Built with ❤️ for OseCaadeGas.pt**
