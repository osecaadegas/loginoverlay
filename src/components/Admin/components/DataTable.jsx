import React from 'react';
import './DataTable.css';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const DataTable = ({ 
  columns = [], 
  data = [], 
  onRowClick,
  emptyState,
  loading = false,
  pagination,
  sortable = true
}) => {
  const [sortConfig, setSortConfig] = React.useState({ key: null, direction: null });

  const handleSort = (columnKey) => {
    if (!sortable) return;
    
    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: columnKey, direction });
  };

  const getSortedData = () => {
    if (!sortConfig.key) return data;

    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal === null) return 1;
      if (bVal === null) return -1;
      if (aVal === bVal) return 0;

      if (sortConfig.direction === 'asc') {
        return aVal < bVal ? -1 : 1;
      } else {
        return aVal > bVal ? -1 : 1;
      }
    });

    return sorted;
  };

  const sortedData = getSortedData();

  const renderSortIcon = (columnKey) => {
    if (!sortable) return null;
    
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown size={14} className="sort-icon inactive" />;
    }
    
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={14} className="sort-icon active" />
      : <ChevronDown size={14} className="sort-icon active" />;
  };

  if (loading) {
    return (
      <div className="data-table-container">
        <div className="data-table">
          <div className="table-skeleton">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-row">
                {columns.map((col, j) => (
                  <div key={j} className="skeleton-cell" style={{ width: col.width || 'auto' }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="data-table-container">
        {emptyState || (
          <div className="table-empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">No data available</div>
            <div className="empty-description">There are no records to display</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="data-table-container">
      <div className="data-table">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th 
                  key={column.key}
                  style={{ width: column.width || 'auto' }}
                  className={column.sortable !== false && sortable ? 'sortable' : ''}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="th-content">
                    <span>{column.label}</span>
                    {column.sortable !== false && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIndex) => (
              <tr 
                key={rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={onRowClick ? 'clickable' : ''}
              >
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render 
                      ? column.render(row[column.key], row) 
                      : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="table-pagination">
          <div className="pagination-info">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <div className="pagination-controls">
            <button 
              className="pagination-btn"
              disabled={pagination.currentPage === 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
            >
              ← Previous
            </button>
            <button 
              className="pagination-btn"
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
            >
              Next →
            </button>
          </div>
          <div className="pagination-size">
            <select 
              value={pagination.perPage}
              onChange={(e) => pagination.onPerPageChange(Number(e.target.value))}
            >
              {pagination.perPageOptions.map(option => (
                <option key={option} value={option}>{option} per page</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
