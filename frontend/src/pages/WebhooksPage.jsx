import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaBell, FaPaperPlane, FaTrash, FaPlus } from 'react-icons/fa';
import { fetchWebhooks, createWebhook, deleteWebhook, testWebhook } from '../services/api';

const ALLOWED_EVENTS = [
  'batch.created',
  'batch.completed',
  'batch.failed',
  'lab_result.recorded',
  'lab_result.out_of_spec',
  'fermentation.alert',
  'tank.cip_due',
  'inventory.low',
  'distribution.shipped',
  'event.scheduled',
];

function WebhooksPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ url: '', secret: '', events: ['batch.created'] });
  const [testResult, setTestResult] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetchWebhooks();
      setItems(Array.isArray(r.data) ? r.data : (r.data?.data || []));
    } catch (err) {
      toast.error('Failed to load webhooks');
    }
    setLoading(false);
  };

  const toggleEvent = (ev) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.url) { toast.warn('URL is required'); return; }
    if (form.events.length === 0) { toast.warn('Select at least one event'); return; }
    setCreating(true);
    try {
      await createWebhook({ url: form.url, events: form.events, secret: form.secret || null });
      toast.success('Webhook created');
      setForm({ url: '', secret: '', events: ['batch.created'] });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create');
    }
    setCreating(false);
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this webhook?')) return;
    try {
      await deleteWebhook(id);
      setItems((xs) => xs.filter((x) => x.id !== id));
      toast.success('Removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const test = async (id) => {
    setTestResult(null);
    try {
      const r = await testWebhook(id);
      setTestResult(r.data);
      toast.success('Test payload generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Test failed');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>
          <button className="btn btn-icon" onClick={() => navigate('/dashboard')}>
            <FaArrowLeft />
          </button>
          <FaBell style={{ marginRight: '0.5rem', color: 'var(--primary)' }} />
          Webhook Subscriptions
        </h1>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
        <h3>New Subscription</h3>
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label>Endpoint URL</label>
              <input type="url" placeholder="https://example.com/hooks/brewery" value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Signing Secret (optional)</label>
              <input type="text" placeholder="hex/base64" value={form.secret}
                onChange={(e) => setForm({ ...form, secret: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Events</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {ALLOWED_EVENTS.map((ev) => (
                <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} />
                  <span>{ev}</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            <FaPlus /> {creating ? 'Creating...' : 'Create Subscription'}
          </button>
        </form>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <h3>Active Webhooks</h3>
        {loading && <p>Loading...</p>}
        {!loading && items.length === 0 && <p>No webhooks subscribed yet.</p>}
        {!loading && items.length > 0 && (
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>URL</th><th>Events</th><th>Active</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id}>
                  <td>{w.id}</td>
                  <td style={{ wordBreak: 'break-all', maxWidth: 300 }}>{w.url}</td>
                  <td style={{ fontSize: '0.85rem' }}>{(w.events || []).join(', ')}</td>
                  <td>{w.active ? 'Yes' : 'No'}</td>
                  <td>{w.created_at ? new Date(w.created_at).toLocaleString() : ''}</td>
                  <td>
                    <button className="btn btn-secondary btn-sm" onClick={() => test(w.id)} style={{ marginRight: '0.5rem' }}>
                      <FaPaperPlane /> Test
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => remove(w.id)}>
                      <FaTrash /> Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {testResult && (
        <div className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
          <h3>Test Payload</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 400, overflow: 'auto', fontSize: '0.85rem' }}>
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default WebhooksPage;
