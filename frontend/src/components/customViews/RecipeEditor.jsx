import React, { useEffect, useState } from 'react';
import { fetchRecipeList, fetchRecipe, saveRecipe } from '../../services/api';

const FIELDS = [
  { key: 'recipe_name', label: 'Recipe name', type: 'text' },
  { key: 'style', label: 'Style', type: 'text' },
  { key: 'brewer', label: 'Brewer', type: 'text' },
  { key: 'status', label: 'Status', type: 'text' },
  { key: 'og', label: 'OG', type: 'number', step: '0.001' },
  { key: 'fg', label: 'FG', type: 'number', step: '0.001' },
  { key: 'abv', label: 'ABV %', type: 'number', step: '0.1' },
  { key: 'ibu', label: 'IBU', type: 'number', step: '0.1' },
  { key: 'mash_temp', label: 'Mash temp °F', type: 'number', step: '0.1' },
  { key: 'volume_gallons', label: 'Volume (gal)', type: 'number', step: '0.1' },
  { key: 'grain_bill', label: 'Grain bill', type: 'textarea' },
  { key: 'hops', label: 'Hops', type: 'textarea' },
  { key: 'yeast', label: 'Yeast', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function RecipeEditor() {
  const [recipes, setRecipes] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetchRecipeList()
      .then(r => {
        const list = r.data?.recipes || [];
        setRecipes(list);
        if (list.length) setSelectedId(String(list[0].id));
      })
      .catch(e => setErr(e.message || 'load failed'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setStatus(null);
    fetchRecipe(selectedId)
      .then(r => setForm(r.data?.recipe || {}))
      .catch(e => setErr(e.message || 'recipe load failed'));
  }, [selectedId]);

  function update(k, v) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    setStatus(null);
    try {
      const payload = {};
      FIELDS.forEach(f => {
        if (form[f.key] !== undefined && form[f.key] !== null && form[f.key] !== '') {
          payload[f.key] = f.type === 'number' ? Number(form[f.key]) : form[f.key];
        }
      });
      const r = await saveRecipe(selectedId, payload);
      setStatus('Saved.');
      setForm(r.data?.recipe || form);
    } catch (e) {
      setStatus('Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 20, color: '#888' }}>Loading recipes...</div>;
  if (err) return <div style={{ padding: 20, color: '#dc143c' }}>Error: {err}</div>;

  return (
    <div style={{ padding: 16, background: '#1a1a1a', borderRadius: 8, border: '1px solid #333' }}>
      <h3 style={{ color: '#b8860b', marginTop: 0 }}>Recipe Editor</h3>
      <div style={{ color: '#aaa', fontSize: 13, marginBottom: 12 }}>
        Edit brew-log recipe fields and persist them via PUT /api/custom-views/recipe/:id.
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ color: '#ccc', fontSize: 13, marginRight: 8 }}>Recipe:</label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          style={{
            background: '#222', color: '#fff', border: '1px solid #444',
            padding: '6px 10px', borderRadius: 4, minWidth: 320,
          }}
        >
          {recipes.map(r => (
            <option key={r.id} value={r.id}>#{r.id} — {r.recipe_name}</option>
          ))}
        </select>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 12,
      }}>
        {FIELDS.map(f => (
          <div key={f.key} style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={{ color: '#aaa', fontSize: 12, marginBottom: 4 }}>{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea
                value={form[f.key] ?? ''}
                onChange={e => update(f.key, e.target.value)}
                rows={3}
                style={{
                  background: '#222', color: '#fff', border: '1px solid #444',
                  padding: 6, borderRadius: 4, fontFamily: 'inherit', fontSize: 13,
                }}
              />
            ) : (
              <input
                type={f.type}
                step={f.step}
                value={form[f.key] ?? ''}
                onChange={e => update(f.key, e.target.value)}
                style={{
                  background: '#222', color: '#fff', border: '1px solid #444',
                  padding: 6, borderRadius: 4, fontSize: 13,
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: '#b8860b', color: '#fff', border: 0, fontWeight: 600,
            padding: '10px 18px', borderRadius: 4, cursor: 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >{saving ? 'Saving...' : 'Save recipe'}</button>
        {status && (
          <span style={{
            color: status.startsWith('Error') ? '#dc143c' : '#2e8b57',
            fontSize: 13,
          }}>{status}</span>
        )}
      </div>
    </div>
  );
}
