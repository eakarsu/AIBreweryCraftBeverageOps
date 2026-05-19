import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { fetchFermentationTimeline } from '../../services/api';

const COLORS = ['#b8860b', '#1e90ff', '#9370db', '#2e8b57', '#dc143c', '#ff8c00', '#20b2aa', '#cd5c5c'];

export default function FermentationTimeline() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetchFermentationTimeline({ batches: 6 })
      .then(r => { if (!cancel) setData(r.data); })
      .catch(e => { if (!cancel) setErr(e.message || 'load failed'); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#888' }}>Loading fermentation timeline...</div>;
  if (err) return <div style={{ padding: 20, color: '#dc143c' }}>Error: {err}</div>;
  if (!data || !data.batches?.length) return <div style={{ padding: 20, color: '#888' }}>No fermentation data available.</div>;

  return (
    <div style={{ padding: 16, background: '#1a1a1a', borderRadius: 8, border: '1px solid #333' }}>
      <h3 style={{ color: '#b8860b', marginTop: 0 }}>Fermentation Timeline</h3>
      <div style={{ color: '#aaa', fontSize: 13, marginBottom: 12 }}>
        Gravity drop across {data.batches.length} recent batches (day index on x-axis).
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={data.grid}>
            <CartesianGrid stroke="#333" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="#888" label={{ value: 'Day', position: 'insideBottom', offset: -3, fill: '#888' }} />
            <YAxis stroke="#888" domain={['auto', 'auto']} label={{ value: 'Specific Gravity', angle: -90, position: 'insideLeft', fill: '#888' }} />
            <Tooltip contentStyle={{ background: '#222', border: '1px solid #444' }} />
            <Legend />
            {data.batches.map((b, i) => (
              <Line
                key={b.batch_id}
                type="monotone"
                dataKey={`grav_${b.batch_id}`}
                name={`#${b.batch_id} ${b.recipe_name || ''}`.slice(0, 28)}
                stroke={COLORS[i % COLORS.length]}
                dot={{ r: 3 }}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: 18 }}>
        <h4 style={{ color: '#ccc' }}>Temperature trend (°F)</h4>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={data.grid}>
              <CartesianGrid stroke="#333" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="#888" />
              <YAxis stroke="#888" domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#222', border: '1px solid #444' }} />
              <Legend />
              {data.batches.map((b, i) => (
                <Line
                  key={b.batch_id}
                  type="monotone"
                  dataKey={`temp_${b.batch_id}`}
                  name={`#${b.batch_id} temp`}
                  stroke={COLORS[i % COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
