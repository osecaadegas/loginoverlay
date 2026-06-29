import React from 'react';

export default function FilterBar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  activeFilter,
  onFilterChange,
  statusFilters = [],
  activeStatus,
  onStatusChange,
  sortValue,
  onSortChange,
  sortOptions = [],
  meta,
  className = '',
}) {
  return (
    <div className={`oc-ui-filterbar${className ? ` ${className}` : ''}`}>
      {onSearchChange && (
        <label className="oc-ui-filterbar__search">
          <span className="oc-ui-filterbar__search-icon">Search</span>
          <input
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </label>
      )}

      {filters.length > 0 && (
        <div className="oc-ui-filterbar__chips" aria-label="Category filters">
          {filters.map(filter => (
            <button
              key={filter.key}
              type="button"
              className={`oc-ui-chip${activeFilter === filter.key ? ' oc-ui-chip--active' : ''}`}
              onClick={() => onFilterChange?.(filter.key)}
            >
              {filter.label}
              {filter.count != null && <span>{filter.count}</span>}
            </button>
          ))}
        </div>
      )}

      {statusFilters.length > 0 && (
        <div className="oc-ui-filterbar__chips oc-ui-filterbar__chips--status" aria-label="Status filters">
          {statusFilters.map(filter => (
            <button
              key={filter.key}
              type="button"
              className={`oc-ui-chip${activeStatus === filter.key ? ' oc-ui-chip--active' : ''}`}
              onClick={() => onStatusChange?.(filter.key)}
            >
              {filter.label}
              {filter.count != null && <span>{filter.count}</span>}
            </button>
          ))}
        </div>
      )}

      {sortOptions.length > 0 && (
        <select className="oc-ui-filterbar__sort" value={sortValue} onChange={e => onSortChange?.(e.target.value)}>
          {sortOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      )}

      {meta && <span className="oc-ui-filterbar__meta">{meta}</span>}
    </div>
  );
}
