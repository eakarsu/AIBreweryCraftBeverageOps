import React, { useEffect, useState } from 'react';
import { fetchTankStatusBoard } from '../../services/api';

const STATUS_COLORS = {
  'in-use': '#1e90ff',
  'in_use': '#1e90ff',
  'available': '#2e8b57',
  'cleaning': '#ff8c00',
  'maintenance': '#dc143c',
  'unknown': '#666',
};

function colorFor(status) {
  const k = (status || 'unknown').toLowerCase();
  return STATUS_COLORS[k] || '#888';
}

// Heatmap color based on utilization percent (0..1)
function heatColor(util) {
  if (util === null || util === undefined || isNaN(util)) return '#222';
  const u = Math.max(0, Math.min(1, util));
  // Gradient: green (low) -> amber (mid) -> red (high)
  const r = Math.round(46 + (255 - 46) * u);
  const g = Math.round(139 - 79 * Math.max(0, u - 0.5) * 2);
  const b = Math.round(87 * (1 - u));
  return `rgb(${r},${Math.max(20, g)},${b})`;
}

export default function TankStatusBoard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    fetchTankStatusBoard()
      .then(r => { if (!cancel) setData(r.data); })
      .catch(e => { if (!cancel) setErr(e.message || 'load failed'); })
      .finally(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#888' }}>Loading tank utilization heatmap...</div>;
  if (err) return <div style={{ padding: 20, color: '#dc143c' }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 20 }}>No tanks.</div>;

  const s = data.summary || {};
  const tanks = data.tanks || [];

  // Build a grid: rows = tank type, columns = tank (sorted by name)
  const byType = {};
  tanks.forEach(t => {
    const k = (t.type || 'tank').toString();
    if (!byType[k]) byType[k] = [];
    byType[k].push(t);
  });
  const typeKeys = Object.keys(byType).sort();
  const maxColumns = Math.max(...typeKeys.map(k => byType[k].length), 1);

  return (
    <div style={{ padding: 16, background: '#1a1a1a', borderRadius: 8, border: '1px solid #333' }}>
      <h3 style={{ color: '#b8860b', marginTop: 0 }}>Tank Utilization Heatmap</h3>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <SummaryCell label="Total" value={s.total} color="#ccc" />
        <SummaryCell label="In use" value={s.in_use} color="#1e90ff" />
        <SummaryCell label="Available" value={s.available} color="#2e8b57" />
        <SummaryCell label="Cleaning" value={s.cleaning} color="#ff8c00" />
        <SummaryCell label="Maintenance" value={s.maintenance} color="#dc143c" />
        <SummaryCell label="Capacity (gal)" value={Math.round(s.total_capacity || 0)} color="#b8860b" />
      </div>

      {/* Heatmap grid */}
      <div style={{ background: '#111', borderRadius: 8, padding: 14, marginBottom: 18, overflowX: 'auto' }}>
        <div style={{ color: '#aaa', fontSize: 12, marginBottom: 8 }}>
          Rows = tank type · Columns = tank · Cell color = utilization (green = low, red = high)
        </div>
        <table style={{ borderCollapse: 'separate', borderSpacing: 4, width: '100%' }}>
          <tbody>
            {typeKeys.map(typeKey => (
              <tr key={typeKey}>
                <td style={{
                  color: '#ddd', fontSize: 12, padding: '4px 10px',
                  background: '#222', borderRadius: 4, whiteSpace: 'nowrap',
                  textTransform: 'capitalize',
                }}>
                  {typeKey}
                </td>
                {Array.from({ length: maxColumns }).map((_, i) => {
                  const t = byType[typeKey][i];
                  if (!t) {
                    return <td key={i} style={{ width: 60, height: 44 }} />;
                  }
                  // utilization estimate: in-use=0.9, cleaning=0.5, maintenance=0.3, available=0.05
                  const k = (t.status || 'unknown').toLowerCase();
                  let util = 0.05;
                  if (/use/.test(k)) util = 0.9;
                  else if (/clean/.test(k)) util = 0.55;
                  else if (/maint/.test(k)) util = 0.3;
                  const bg = heatColor(util);
                  return (
                    <td key={i} title={`${t.name} - ${t.status} - ${t.capacity_gallons || '?'} gal`}
                      style={{
                        width: 80, height: 50, background: bg,
                        borderRadius: 4, padding: 4, color: '#fff',
                        fontSize: 11, textAlign: 'center', cursor: 'default',
                      }}>
                      <div style={{ fontWeight: 700 }}>{t.name}</div>
                      <div style={{ opacity: 0.85 }}>{Math.round(util * 100)}%</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <span style={{ fontSize: 11, color: '#888' }}>Low</span>
          {[0, 0.25, 0.5, 0.75, 1].map(v => (
            <div key={v} style={{
              width: 36, height: 14, background: heatColor(v),
              borderRadius: 2, fontSize: 10, color: '#fff', textAlign: 'center',
            }}>{Math.round(v * 100)}%</div>
          ))}
          <span style={{ fontSize: 11, color: '#888' }}>High</span>
        </div>
      </div>

      {/* Detailed cards below */}
      <h4 style={{ color: '#ccc', marginTop: 0 }}>Tank details</h4>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 12,
      }}>
        {tanks.map(t => (
          <div key={t.id} style={{
            background: '#222',
            border: `2px solid ${colorFor(t.status)}`,
            borderRadius: 8,
            padding: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{t.name}</div>
              <span style={{
                background: colorFor(t.status), color: '#fff', fontSize: 11,
                padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase',
              }}>{t.status}</span>
            </div>
            <div style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>{t.type || 'tank'}</div>
            <div style={{ color: '#ddd', fontSize: 13, marginTop: 8 }}>
              Batch: <strong>{t.current_batch || '-'}</strong>
            </div>
            <div style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>
              Capacity: {t.capacity_gallons || '-'} gal
            </div>
            <div style={{ color: '#ccc', fontSize: 12 }}>
              Temp: {t.temperature ?? '-'} F - PSI: {t.pressure_psi ?? '-'}
            </div>
            {t.latest_reading && (
              <div style={{
                marginTop: 8, paddingTop: 8, borderTop: '1px dashed #444',
                fontSize: 11, color: '#999',
              }}>
                Last reading {String(t.latest_reading.date).slice(0, 10)}:
                {' '}gravity {t.latest_reading.gravity ?? '-'},
                {' '}pH {t.latest_reading.ph ?? '-'}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCell({ label, value, color }) {
  return (
    <div style={{
      background: '#222', borderRadius: 6, padding: '8px 14px',
      borderLeft: `4px solid ${color}`, minWidth: 110,
    }}>
      <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{value ?? 0}</div>
    </div>
  );
}
