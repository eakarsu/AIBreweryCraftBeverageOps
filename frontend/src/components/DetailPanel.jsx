import React from 'react';

function DetailPanel({ data, onEdit, onDelete }) {
  if (!data) return null;

  const formatKey = (key) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (s) => s.toUpperCase());
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const getStatusClass = (value) => {
    if (typeof value !== 'string') return '';
    const v = value.toLowerCase();
    if (['active', 'pass', 'completed', 'delivered', 'paid', 'available', 'clean', 'approved'].includes(v)) return 'badge-success';
    if (['pending', 'in_progress', 'in_use', 'fermenting', 'scheduled', 'processing', 'in-progress'].includes(v)) return 'badge-warning';
    if (['fail', 'lost', 'cancelled', 'overdue', 'inactive', 'damaged', 'rejected', 'failed'].includes(v)) return 'badge-danger';
    return '';
  };

  const excludeKeys = ['__v', 'createdAt', 'updatedAt'];

  return (
    <div className="detail-panel">
      {Object.entries(data)
        .filter(([key]) => !excludeKeys.includes(key))
        .map(([key, value]) => {
          const statusClass = key.toLowerCase().includes('status') || key.toLowerCase().includes('result')
            ? getStatusClass(value)
            : '';
          return (
            <div className="detail-row" key={key}>
              <div className="detail-label">{formatKey(key)}</div>
              <div className="detail-value">
                {statusClass ? (
                  <span className={`badge ${statusClass}`}>{formatValue(value)}</span>
                ) : (
                  formatValue(value)
                )}
              </div>
            </div>
          );
        })}
      <div className="detail-actions">
        <button className="btn btn-primary btn-sm" onClick={onEdit}>
          Edit
        </button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default DetailPanel;
