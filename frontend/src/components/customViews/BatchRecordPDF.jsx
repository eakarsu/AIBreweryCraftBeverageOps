import React, { useEffect, useState } from 'react';
import { fetchRecipeList, batchRecordPdfUrl } from '../../services/api';

export default function BatchRecordPDF() {
  const [recipes, setRecipes] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancel = false;
    fetchRecipeList()
      .then(r => {
        if (cancel) return;
        const list = r.data?.recipes || [];
        setRecipes(list);
        if (list.length) setSelected(String(list[0].id));
      })
      .catch(e => { if (!cancel) setErr(e.message || 'load failed'); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  async function handleDownload() {
    if (!selected) return;
    setStatus('Generating PDF...');
    try {
      const token = localStorage.getItem('token');
      const url = batchRecordPdfUrl(selected);
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `batch-record-${selected}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
      setStatus('Downloaded.');
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
  }

  function handlePreview() {
    if (!selected) return;
    const token = localStorage.getItem('token');
    const url = batchRecordPdfUrl(selected);
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const u = URL.createObjectURL(blob);
        window.open(u, '_blank');
      })
      .catch(e => setStatus('Error: ' + e.message));
  }

  if (loading) return <div style={{ padding: 20, color: '#888' }}>Loading recipes...</div>;
  if (err) return <div style={{ padding: 20, color: '#dc143c' }}>Error: {err}</div>;

  return (
    <div style={{ padding: 16, background: '#1a1a1a', borderRadius: 8, border: '1px solid #333' }}>
      <h3 style={{ color: '#b8860b', marginTop: 0 }}>Batch Record PDF Export</h3>
      <div style={{ color: '#aaa', fontSize: 13, marginBottom: 14 }}>
        Generate a printable PDF brew sheet that bundles batch metadata, fermentation log, and lab results.
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ color: '#ccc', fontSize: 13 }}>Batch:</label>
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={{
            background: '#222', color: '#fff', border: '1px solid #444',
            padding: '6px 10px', borderRadius: 4, minWidth: 280,
          }}
        >
          {recipes.map(r => (
            <option key={r.id} value={r.id}>
              #{r.id} — {r.recipe_name} ({r.style || 'n/a'})
            </option>
          ))}
        </select>

        <button
          onClick={handlePreview}
          style={{
            background: '#444', color: '#fff', border: 0,
            padding: '8px 14px', borderRadius: 4, cursor: 'pointer',
          }}
        >Preview</button>

        <button
          onClick={handleDownload}
          style={{
            background: '#b8860b', color: '#fff', border: 0, fontWeight: 600,
            padding: '8px 14px', borderRadius: 4, cursor: 'pointer',
          }}
        >Download PDF</button>
      </div>

      {status && (
        <div style={{
          marginTop: 12, padding: 10,
          background: status.startsWith('Error') ? '#3b1d1d' : '#1d3b1d',
          borderRadius: 4, color: '#fff', fontSize: 13,
        }}>{status}</div>
      )}

      <div style={{ marginTop: 16, color: '#888', fontSize: 12 }}>
        {recipes.length} recipes available. PDF includes fermentation curve & lab data when present.
      </div>
    </div>
  );
}
