import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaExclamationTriangle, FaExclamationCircle, FaSync } from 'react-icons/fa';
import { fetchAlerts } from '../services/api';

const TYPE_LABELS = {
  low_stock: 'Low Stock',
  maintenance_overdue: 'Maintenance Overdue',
  cip_overdue: 'CIP Overdue',
  lab_failure: 'Lab Failure',
};

const RESOURCE_ROUTES = {
  raw_materials: 'raw-materials',
  equipment: 'equipment',
  cip_schedules: 'cip-schedules',
  lab_results: 'lab-results',
};

function AlertsPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({ total: 0, critical: 0, warning: 0 });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetchAlerts();
      setAlerts(res.data?.data || []);
      setSummary(res.data?.summary || { total: 0, critical: 0, warning: 0 });
    } catch (err) {
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const filtered = typeFilter === 'all' ? alerts : alerts.filter(a => a.type === typeFilter);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>
          <button className="btn btn-icon" onClick={() => navigate('/dashboard')}>
            <FaArrowLeft />
          </button>
          <FaExclamationTriangle style={{ marginRight: '0.5rem', color: 'var(--warning)' }} />
          Operational Alerts
        </h1>
        <button className="btn btn-secondary" onClick={loadAlerts}>
          <FaSync /> Refresh
        </button>
      </div>

      <div className="stats-bar" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--danger)' }}>&#9888;</span>
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{summary.critical}</div>
            <div className="stat-label">Critical</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon" style={{ color: 'var(--warning)' }}>&#9888;</span>
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--warning)' }}>{summary.warning}</div>
            <div className="stat-label">Warning</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">&#128202;</span>
          <div className="stat-info">
            <div className="stat-value">{summary.total}</div>
            <div className="stat-label">Total Alerts</div>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <select
            className="form-control"
            style={{ width: '200px' }}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {filtered.length} alert{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Loading alerts...
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#9989;</div>
          <h3>No alerts</h3>
          <p>All systems operating normally.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map((alert, idx) => (
            <div
              key={idx}
              className="card"
              style={{
                padding: '1rem 1.25rem',
                borderLeft: `4px solid ${alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'}`,
                cursor: RESOURCE_ROUTES[alert.resource] ? 'pointer' : 'default',
              }}
              onClick={() => {
                if (RESOURCE_ROUTES[alert.resource]) {
                  navigate(`/feature/${RESOURCE_ROUTES[alert.resource]}`);
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ color: alert.severity === 'critical' ? 'var(--danger)' : 'var(--warning)', fontSize: '1.1rem', marginTop: '2px' }}>
                  {alert.severity === 'critical' ? <FaExclamationCircle /> : <FaExclamationTriangle />}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className={`badge ${alert.severity === 'critical' ? 'badge-danger' : 'badge-warning'}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                      {TYPE_LABELS[alert.type] || alert.type}
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{alert.title}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{alert.detail}</div>
                  {RESOURCE_ROUTES[alert.resource] && (
                    <div style={{ color: 'var(--info)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                      Click to view in {alert.resource.replace(/_/g, ' ')} →
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AlertsPage;
