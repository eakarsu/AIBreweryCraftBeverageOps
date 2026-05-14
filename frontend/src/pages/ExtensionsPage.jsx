// Apply pass 5: Extensions page surfacing notifications, reports, RAG, tenants, agents.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft } from 'react-icons/fa';
import {
  fetchNotificationStatus,
  sendNotification,
  fetchReport,
  queryRag,
  indexRagDoc,
  fetchTenants,
  upsertTenant,
  runAgent,
  fetchAgentRuns,
  dispatchWebhook,
} from '../services/api';

function Section({ title, children }) {
  return (
    <div style={{ background: '#1a1a1a', padding: 16, borderRadius: 8, marginBottom: 16 }}>
      <h3 style={{ marginTop: 0, color: '#f0a040' }}>{title}</h3>
      {children}
    </div>
  );
}

export default function ExtensionsPage() {
  const navigate = useNavigate();
  const [notifStatus, setNotifStatus] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [agentRuns, setAgentRuns] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [ragResult, setRagResult] = useState(null);
  const [ragQuery, setRagQuery] = useState('');
  const [agentObj, setAgentObj] = useState('');

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [s, t, a] = await Promise.all([
        fetchNotificationStatus().catch(() => ({ data: null })),
        fetchTenants().catch(() => ({ data: [] })),
        fetchAgentRuns().catch(() => ({ data: [] })),
      ]);
      setNotifStatus(s.data);
      setTenants(t.data || []);
      setAgentRuns(a.data || []);
    } catch (e) { console.warn(e); }
  };

  const onReport = async (type) => {
    try {
      const r = await fetchReport(type);
      setReportData(r.data);
    } catch (e) { toast.error(e.message); }
  };

  const onRag = async () => {
    if (!ragQuery) return;
    try {
      const r = await queryRag(ragQuery, 5);
      setRagResult(r.data);
    } catch (e) { toast.error(e.message); }
  };

  const onAgent = async () => {
    if (!agentObj) return;
    try {
      await runAgent(agentObj, {}, 'linear-planner');
      toast.success('Agent run queued');
      const a = await fetchAgentRuns();
      setAgentRuns(a.data || []);
    } catch (e) { toast.error(e.message); }
  };

  const onTestSMS = async () => {
    try {
      await sendNotification({ channel: 'sms', recipient: '+15555550100', body: 'test' });
      toast.success('SMS queued');
    } catch (e) {
      const data = e.response?.data;
      toast.warn(`Provider missing: ${(data?.missing || []).join(', ')}`);
    }
  };

  const onAddTenant = async () => {
    const slug = prompt('tenant_slug');
    const name = prompt('brand_name');
    if (!slug) return;
    try {
      await upsertTenant({ tenant_slug: slug, brand_name: name });
      const t = await fetchTenants();
      setTenants(t.data || []);
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div style={{ padding: 24, color: '#eee', fontFamily: 'sans-serif' }}>
      <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: '#f0a040', cursor: 'pointer', marginBottom: 16 }}>
        <FaArrowLeft /> Back
      </button>
      <h2>Extensions (Apply pass 5)</h2>

      <Section title="Notifications">
        <div>email: {notifStatus?.email ? 'configured' : 'not configured'}</div>
        <div>sms: {notifStatus?.sms ? 'configured' : 'not configured'}</div>
        <div>push: {notifStatus?.push ? 'configured' : 'not configured'}</div>
        <button onClick={onTestSMS} style={{ marginTop: 8 }}>Try send SMS</button>
      </Section>

      <Section title="Reports / Export">
        {['batches', 'lab-results', 'inventory', 'distributions'].map(t => (
          <button key={t} onClick={() => onReport(t)} style={{ marginRight: 8 }}>{t}</button>
        ))}
        {reportData && (
          <pre style={{ background: '#0f0f0f', padding: 8, marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
            {JSON.stringify(reportData, null, 2)}
          </pre>
        )}
      </Section>

      <Section title="RAG">
        <input value={ragQuery} onChange={e => setRagQuery(e.target.value)} placeholder="Ask brewery question"
               style={{ padding: 6, marginRight: 8, width: 300 }} />
        <button onClick={onRag}>Query</button>
        <button onClick={async () => {
          await indexRagDoc({ source: 'manual', title: 'IPA notes',
            text: 'IPA recipes commonly use Citra and Mosaic hops at whirlpool and dry-hop additions.' });
          toast.success('Indexed sample doc');
        }} style={{ marginLeft: 8 }}>Index sample doc</button>
        {ragResult && (
          <pre style={{ background: '#0f0f0f', padding: 8, marginTop: 8, maxHeight: 240, overflow: 'auto' }}>
            {JSON.stringify(ragResult, null, 2)}
          </pre>
        )}
      </Section>

      <Section title="Multi-agent run">
        <input value={agentObj} onChange={e => setAgentObj(e.target.value)} placeholder="Objective"
               style={{ padding: 6, marginRight: 8, width: 300 }} />
        <button onClick={onAgent}>Plan</button>
        <ul>{(agentRuns || []).slice(0, 5).map(r => <li key={r.id}>{r.id} — {r.objective} ({r.status})</li>)}</ul>
      </Section>

      <Section title="White-label tenants">
        <button onClick={onAddTenant}>+ Add tenant</button>
        <ul>{tenants.map(t => <li key={t.id}>{t.tenant_slug} — {t.brand_name}</li>)}</ul>
      </Section>

      <Section title="Webhook delivery">
        <button onClick={async () => {
          const r = await dispatchWebhook('batch.completed', { test: true });
          toast.info(`Dispatched ${r.data?.dispatched || 0}`);
        }}>Dispatch test event</button>
      </Section>
    </div>
  );
}
