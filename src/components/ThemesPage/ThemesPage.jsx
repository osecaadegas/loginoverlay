import { useState, useMemo } from 'react';
import { themeList, THEME_CATEGORIES } from '../../data/appThemes';
import './ThemesPage.css';

function ThemeCard({ theme, isActive, onSelect }) {
  const { colors } = theme;
  return (
    <div
      className={`theme-card${isActive ? ' theme-card--active' : ''}`}
      onClick={() => onSelect(theme.id)}
      style={{ borderColor: isActive ? colors.primary : undefined }}
    >
      {isActive && <div className="theme-card__check">✓</div>}
      {theme.id.startsWith('fx-') && <div className="theme-card__fx-badge">FX</div>}

      {/* Color swatch with mini mockup */}
      <div className="theme-card__swatch">
        <div className="theme-card__swatch-bg" style={{ background: colors.background }} />
        <div
          className="theme-card__mockup"
          style={{ background: colors.panelBg, border: `1px solid ${colors.border}` }}
        >
          <div className="theme-card__mockup-bar" style={{ background: colors.primary }} />
          <div className="theme-card__mockup-bar" style={{ background: colors.secondary }} />
          <div className="theme-card__mockup-dots">
            <div className="theme-card__mockup-dot" style={{ background: colors.primary }} />
            <div className="theme-card__mockup-dot" style={{ background: colors.secondary }} />
            <div className="theme-card__mockup-dot" style={{ background: colors.accent }} />
          </div>
        </div>
      </div>

      <div className="theme-card__info">
        <div className="theme-card__name" style={{ color: isActive ? colors.primary : undefined }}>
          {theme.name}
        </div>
        <div className="theme-card__category">{theme.category}</div>
      </div>
    </div>
  );
}

export default function ThemesPage({ onApply }) {
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem('overlayTheme') || 'default';
  });

  const handleSelect = (themeId) => {
    setSelectedTheme(themeId);
    localStorage.setItem('overlayTheme', themeId);
    if (onApply) onApply(themeId);
  };
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  // Count per category
  const categoryCounts = useMemo(() => {
    const counts = { all: themeList.length };
    for (const t of themeList) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return counts;
  }, []);

  // Filter
  const filtered = useMemo(() => {
    let list = themeList;
    if (category !== 'all') {
      list = list.filter(t => t.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    }
    return list;
  }, [category, search]);

  const activeTheme = themeList.find(t => t.id === selectedTheme);

  return (
    <div className="themes-page">
      <div className="themes-header">
        <h1>🎨 Themes</h1>
        <p>{themeList.length} themes available — pick your vibe</p>
      </div>

      {/* Current theme banner */}
      {activeTheme && (
        <div className="themes-current">
          <div
            className="themes-current__preview"
            style={{ background: activeTheme.colors.background }}
          >
            <div style={{
              position: 'absolute',
              inset: 4,
              borderRadius: 6,
              background: activeTheme.colors.panelBg,
              border: `1px solid ${activeTheme.colors.border}`,
            }} />
          </div>
          <div className="themes-current__info">
            <div className="themes-current__label">Current Theme</div>
            <div className="themes-current__name">{activeTheme.name}</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="themes-search">
        <span className="themes-search__icon">🔍</span>
        <input
          className="themes-search__input"
          type="text"
          placeholder="Search themes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Category filters */}
      <div className="themes-categories">
        {THEME_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`themes-cat-btn${category === cat.id ? ' themes-cat-btn--active' : ''}`}
            onClick={() => setCategory(cat.id)}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
            <span className="themes-cat-btn__count">({categoryCounts[cat.id] || 0})</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="themes-grid">
          {filtered.map(theme => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={theme.id === selectedTheme}
              onSelect={handleSelect}
            />
          ))}
        </div>
      ) : (
        <div className="themes-empty">
          <div className="themes-empty__icon">🔍</div>
          <div className="themes-empty__text">No themes match your search</div>
        </div>
      )}
    </div>
  );
}
