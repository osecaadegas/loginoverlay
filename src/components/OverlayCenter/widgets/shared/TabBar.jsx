/**
 * Shared TabBar component — replaces tab rendering boilerplate in 19+ config files.
 *
 * Usage:
 *   <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
 *   <TabBar tabs={tabs} active={tab} onChange={setTab} variant="cg" />
 *
 * Each tab: { id: string, label: string, icon?: string }
 */
export default function TabBar({ tabs, active, onChange, variant = 'nb', style }) {
  const wrapperClass = variant === 'cg' ? 'cg-config__tabs' : 'nb-tabs';
  const tabClass = variant === 'cg' ? 'cg-config__tab' : 'nb-tab';
  const activeClass = `${tabClass}--active`;

  return (
    <div className={wrapperClass} style={style}>
      {tabs.map(t => (
        <button
          key={t.id}
          className={`${tabClass}${active === t.id ? ` ${activeClass}` : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.icon ? `${t.icon} ` : ''}{t.label}
        </button>
      ))}
    </div>
  );
}
