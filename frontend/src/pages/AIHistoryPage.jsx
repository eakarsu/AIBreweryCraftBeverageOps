import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaHistory, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { fetchAIResults } from '../services/api';

const FEATURE_LABELS = {
  'recipe-suggestion': 'Recipe Suggestion',
  'tasting-notes': 'Tasting Notes',
  'food-pairing': 'Food Pairing',
  'demand-forecast': 'Demand Forecast',
  'quality-analysis': 'Quality Analysis',
  'label-copy': 'Label Copy',
  'event-content': 'Event Content',
  'predict-quality': 'Quality Prediction',
  'seasonal-planner': 'Seasonal Planner',
  'brew-day-assist': 'Brew Day Assistant',
  'yeast-optimizer': 'Yeast Optimizer',
  'hop-freshness': 'Hop Freshness',
  'water-chemistry': 'Water Chemistry',
  'competition-score': 'Competition Score',
  'cost-optimizer': 'Cost Optimizer',
  'seasonal-menu-planner': 'Seasonal Menu Planner',
  'carbon-footprint': 'Carbon Footprint',
};

function AIHistoryPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [featureFilter, setFeatureFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    loadResults();
  }, [page, featureFilter]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (featureFilter) params.feature = featureFilter;
      const res = await fetchAIResults(params);
      setResults(res.data.data || []);
      setPagination(res.data.pagination || null);
    } catch (err) {
      toast.error('Failed to load AI history');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const formatOutput = (output) => {
    if (!output) return '—';
    if (typeof output === 'string') return output.slice(0, 200) + (output.length > 200 ? '...' : '');
    return JSON.stringify(output, null, 2).slice(0, 400) + '...';
  };

  const formatInput = (input) => {
    if (!input) return '—';
    return Object.entries(input)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`)
      .join(' | ') || '—';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>
          <button className="btn btn-icon" onClick={() => navigate('/dashboard')}>
            <FaArrowLeft />
          </button>
          <FaHistory style={{ marginRight: '0.5rem', color: 'var(--accent-gold)' }} />
          AI History
        </h1>
      </div>

      <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
        Browse all AI-generated results. Filter by feature to find specific analyses.
      </p>

      <div className="toolbar">
        <div className="toolbar-left">
          <select
            className="form-control"
            style={{ width: '220px' }}
            value={featureFilter}
            onChange={e => { setFeatureFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Features</option>
            {Object.entries(FEATURE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {pagination && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {pagination.total} result{pagination.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Loading AI history...
        </div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">&#129302;</div>
          <h3>No AI results yet</h3>
          <p>Use any AI tool to generate results. They will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {results.map(r => (
            <div key={r.id} className="card" style={{ padding: '1.25rem', cursor: 'pointer' }}
              onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                      {FEATURE_LABELS[r.feature] || r.feature}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {r.model && r.model.split('/').pop()}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {formatInput(r.input)}
                  </div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {expanded === r.id ? '▲' : '▼'}
                </span>
              </div>

              {expanded === r.id && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-primary)', paddingTop: '1rem' }}>
                  {r.input && Object.keys(r.input).length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Input</h4>
                      <pre style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', overflow: 'auto', maxHeight: '200px' }}>
                        {JSON.stringify(r.input, null, 2)}
                      </pre>
                    </div>
                  )}
                  {r.output && (
                    <div>
                      <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        AI Output {typeof r.output === 'object' ? '(structured)' : ''}
                      </h4>
                      <pre style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', overflow: 'auto', maxHeight: '300px', whiteSpace: 'pre-wrap' }}>
                        {typeof r.output === 'string' ? r.output : JSON.stringify(r.output, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
            <FaChevronLeft /> Prev
          </button>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}>
            Next <FaChevronRight />
          </button>
        </div>
      )}
    </div>
  );
}

export default AIHistoryPage;
