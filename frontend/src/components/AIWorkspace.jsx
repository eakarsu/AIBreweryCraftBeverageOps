import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AIReport from './AIReport';
import FullFieldPresets from './FullFieldPresets';
import Modal from './AIWorkspaceModal';

const API = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '').replace(/\/api$/, '');
export const workspaceFields = [
  { key: 'input', label: 'Request / brief', required: true, wide: true },
  { key: 'context', label: 'Background and client context', wide: true },
  { key: 'goal', label: 'Desired outcome', required: true },
  { key: 'audience', label: 'Audience' },
  { key: 'source_data', label: 'Source data and observations', wide: true },
  { key: 'constraints', label: 'Constraints and requirements', wide: true },
  { key: 'budget', label: 'Budget and resources' },
  { key: 'deadline', label: 'Deadline', type: 'date' },
  { key: 'tone', label: 'Writing tone', options: ['Professional', 'Friendly', 'Executive'] },
  { key: 'output_format', label: 'Report format', options: ['Summary and action plan', 'Detailed report', 'Executive briefing'] },
];
const emptyFields = () => Object.fromEntries(workspaceFields.map((field) => [field.key, field.options?.[0] || '']));
const readResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
  return data;
};

export function workspacePresets(feature) {
  const samples = feature.samples || [];
  return ['Scenario', 'Data sample', 'Executive review'].map((label, index) => ({ label, values: {
    input: samples[index]?.value || `Prepare a ${feature.title} advisory report for a craft brewery. Identify assumptions, risks, and next steps.`,
    context: `Illustrative brewery planning exercise for ${feature.title}. The brewer and operations lead will verify actual batch records before acting.`,
    goal: ['Prepare a practical brewery plan with priorities and owners.', 'Identify production patterns, evidence gaps, and corrective actions.', 'Explain options and decisions for the brewery leadership review.'][index],
    audience: ['Head brewer and cellar team', 'Quality and operations leads', 'Brewery leadership'][index],
    source_data: ['Illustrative: a 10 BBL pale ale is scheduled next week; fermentation capacity must be confirmed against the actual tank board.', 'Illustrative: gravity is above target on one batch, CIP timing is uncertain, and a packaging hold needs review. Confirm against records.', 'Illustrative: a seasonal release faces limited tank space and an unconfirmed distributor order. Separate assumptions from verified records.'][index],
    constraints: ['Use existing brewery equipment; verify batch references and quality holds.', 'Prioritize safety and product quality; do not invent measurements or approvals.', 'Compare tank capacity, timing, ingredients, and staffing; flag missing evidence.'][index],
    budget: ['Illustrative: 10 BBL pilot using existing ingredients and two brewers', 'Illustrative: one quality review shift and existing lab supplies', 'Illustrative: packaging spend pending supplier quote'][index],
    deadline: new Date(Date.now() + (index + 7) * 86400000).toISOString().slice(0, 10),
    tone: ['Professional', 'Friendly', 'Executive'][index],
    output_format: ['Summary and action plan', 'Detailed report', 'Executive briefing'][index],
  } })).map((preset, index) => ({
    label: feature.presets?.[index]?.label || preset.label,
    values: { ...preset.values, ...feature.presets?.[index]?.values },
  }));
}

export default function AIWorkspace({ feature, token: suppliedToken }) {
  const [fields, setFields] = useState(emptyFields);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorAction, setErrorAction] = useState('');
  const [message, setMessage] = useState('');
  const request = useRef(null);
  const formRef = useRef(null);
  const token = suppliedToken || (typeof window === 'undefined' ? '' : [localStorage.getItem("token"), localStorage.getItem('token'), localStorage.getItem('authToken')].find(Boolean) || '');
  const headers = useMemo(() => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }), [token]);
  const endpoint = `${API}/api/report-workspace`;
  const loadHistory = useCallback(async (signal) => {
    const response = await fetch(`${endpoint}/runs?feature=${encodeURIComponent(feature.id)}`, { headers, signal });
    const data = await readResponse(response); setHistory(Array.isArray(data.items) ? data.items : []);
  }, [endpoint, feature.id, headers]);
  useEffect(() => {
    const controller = new AbortController();
    loadHistory(controller.signal).catch((failure) => {
      if (failure.name !== 'AbortError') {
        setError(failure.message);
        setErrorAction('history');
      }
    });
    return () => { controller.abort(); request.current?.abort(); request.current = null; };
    // A feature route owns its form, result, and history.
  }, [loadHistory]);

  const cancel = () => { request.current?.abort(); request.current = null; setLoading(false); setError(''); setErrorAction(''); setMessage('Request cancelled.'); };
  const run = async (event) => {
    event?.preventDefault(); if (request.current) return;
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(''); setErrorAction(''); setMessage(''); setResult(null);
    try {
      const response = await fetch(`${endpoint}/run`, { method: 'POST', headers, signal: controller.signal, body: JSON.stringify({ feature: feature.id, fields, ...(editingId ? { id: editingId } : {}) }) });
      const data = await readResponse(response);
      if (request.current !== controller) return;
      setResult(data.item); setEditingId(data.item.id); setMessage('Report saved to your history.');
      try {
        await loadHistory(controller.signal);
      } catch (failure) {
        if (failure.name !== 'AbortError') {
          setError(failure.message);
          setErrorAction('history');
        }
      }
    } catch (failure) {
      if (request.current === controller && failure.name !== 'AbortError') {
        setError(failure.message);
        setErrorAction('run');
      }
    }
    finally { if (request.current === controller) { request.current = null; setLoading(false); } }
  };
  const edit = (item) => {
    setFields({ ...emptyFields(), ...item.input }); setEditingId(item.id); setResult(item); setSelected(null); setDeleting(false); setError(''); setMessage('Edit any field, then generate the updated report.');
    formRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };
  const remove = async () => {
    try {
      setError(''); setErrorAction('');
      const response = await fetch(`${endpoint}/runs/${selected.id}`, { method: 'DELETE', headers });
      await readResponse(response);
      if (editingId === selected.id) { setEditingId(null); setResult(null); }
      setSelected(null); setDeleting(false); setMessage('Saved report deleted.'); await loadHistory();
    } catch (failure) {
      setError(failure.message);
      setErrorAction('delete');
    }
  };
  const retry = () => {
    if (errorAction === 'run') run();
    else if (errorAction === 'delete' && selected) remove();
    else {
      setError(''); setErrorAction('');
      loadHistory().catch((failure) => { setError(failure.message); setErrorAction('history'); });
    }
  };
  return <section className="ai-workspace"><header className="ai-workspace-heading"><span className="ai-eyebrow">AI workspace · OpenRouter</span><h1>{feature.title}</h1><p>{feature.description}</p></header>
    <form className="ai-workspace-panel" onSubmit={run} ref={formRef}>
      <FullFieldPresets value={fields} presets={workspacePresets(feature)} disabled={loading} onChange={(next) => { setFields(next); setResult(null); setEditingId(null); setError(''); setErrorAction(''); setMessage('All 10 fields filled, including optional fields. Review the example before generating.'); }} />
      <div className="ai-form-grid">{workspaceFields.map((field) => <div key={field.key} className={`ai-form-field ${field.wide ? 'ai-form-field-wide' : ''}`}><label htmlFor={`${feature.id}-${field.key}`}>{field.label}<span>{field.required ? 'Required' : 'Optional'}</span></label>{field.options ? <select id={`${feature.id}-${field.key}`} value={fields[field.key]} disabled={loading} onChange={(event) => setFields({ ...fields, [field.key]: event.target.value })}>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : field.type ? <input id={`${feature.id}-${field.key}`} type={field.type} value={fields[field.key]} disabled={loading} onChange={(event) => setFields({ ...fields, [field.key]: event.target.value })} /> : <textarea id={`${feature.id}-${field.key}`} rows={field.wide ? 4 : 2} required={field.required} value={fields[field.key]} disabled={loading} onChange={(event) => setFields({ ...fields, [field.key]: event.target.value })} />}</div>)}</div>
      <footer className="ai-workspace-footer"><p className="ai-muted">Review the brief and any examples before generating.</p><div className="ai-actions"><button type="button" className="btn btn-secondary" onClick={() => { if (loading) cancel(); else { setFields(emptyFields()); setResult(null); setEditingId(null); setError(''); setErrorAction(''); setMessage('Form cleared.'); } }}>Cancel</button><button type="submit" className="btn btn-primary" disabled={loading || !fields.input.trim() || !fields.goal.trim()}>{loading ? 'Generating report…' : 'Generate with OpenRouter'}</button></div></footer>
    </form>
    {message && <p role="status" className="ai-muted">{message}</p>}
    {error && errorAction !== 'delete' && <div className="ai-alert" role="alert"><span>{error}</span><button type="button" className="btn btn-secondary btn-sm" onClick={retry}>Retry</button></div>}
    <AIReport response={result} loading={loading} title={feature.title} />
    <section className="ai-history"><h2>Saved reports</h2><p className="ai-muted">Open a report to review it, edit its inputs, or delete it.</p>{!history.length ? <p className="ai-muted">Your generated reports will appear here.</p> : history.map((item) => <button type="button" className="ai-history-row" key={item.id} onClick={() => { setSelected(item); setDeleting(false); }}><span><strong>{String(item.input?.goal || feature.title).slice(0, 100)}</strong><br /><small className="ai-muted">{new Date(item.created_at).toLocaleString()} · {item.model}</small></span><span>Open report →</span></button>)}</section>
    {selected && <Modal className="ai-workspace-dialog" title={deleting ? 'Delete saved report?' : feature.title} onClose={() => { setSelected(null); setDeleting(false); setError(''); setErrorAction(''); }} footer={<><button type="button" className="btn btn-secondary" onClick={() => { setSelected(null); setDeleting(false); setError(''); setErrorAction(''); }}>Cancel</button>{!deleting && <button type="button" className="btn btn-secondary" onClick={() => edit(selected)}>Edit</button>}<button type="button" className="btn btn-danger" onClick={() => { if (!deleting) setDeleting(true); else remove(); }}>{deleting ? 'Confirm delete' : 'Delete'}</button></>}>
      {errorAction === 'delete' && <div className="ai-alert" role="alert"><span>{error}</span><button type="button" className="btn btn-secondary btn-sm" onClick={retry}>Retry</button></div>}
      {deleting ? <p>This deletes the saved report from your history.</p> : <><AIReport response={selected} title={feature.title} /><details><summary>Request inputs</summary><dl>{workspaceFields.map((field) => <React.Fragment key={field.key}><dt><strong>{field.label}</strong></dt><dd>{selected.input?.[field.key] === '' ? 'Empty string' : String(selected.input?.[field.key] ?? 'Not provided')}</dd></React.Fragment>)}</dl></details></>}
    </Modal>}
  </section>;
}
