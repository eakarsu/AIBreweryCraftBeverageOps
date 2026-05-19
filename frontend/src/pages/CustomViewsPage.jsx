import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaChartLine, FaThLarge, FaFilePdf, FaEdit } from 'react-icons/fa';
import FermentationTimeline from '../components/customViews/FermentationTimeline';
import TankStatusBoard from '../components/customViews/TankStatusBoard';
import BatchRecordPDF from '../components/customViews/BatchRecordPDF';
import RecipeEditor from '../components/customViews/RecipeEditor';

const TABS = [
  { key: 'fermentation', label: 'Fermentation Timeline', icon: FaChartLine, viz: true },
  { key: 'tanks', label: 'Tank Utilization Heatmap', icon: FaThLarge, viz: true },
  { key: 'batch-pdf', label: 'Batch Record PDF', icon: FaFilePdf, viz: false },
  { key: 'recipe', label: 'Recipe Editor', icon: FaEdit, viz: false },
];

export default function CustomViewsPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState('fermentation');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d0d0d', color: '#eee' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: '#141414',
        borderRight: '1px solid #2a2a2a',
        padding: '20px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 24 }}>&#127866;</span>
          <div>
            <div style={{ fontWeight: 700, color: '#b8860b' }}>Brewery Views</div>
            <div style={{ fontSize: 11, color: '#888' }}>Custom panels</div>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TABS.map(t => {
            const Icon = t.icon;
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: isActive ? '#b8860b' : 'transparent',
                  color: isActive ? '#fff' : '#ccc',
                  border: 0, borderRadius: 6,
                  textAlign: 'left', cursor: 'pointer', fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <Icon />
                <span>{t.label}</span>
                <span style={{
                  marginLeft: 'auto', fontSize: 10,
                  background: isActive ? 'rgba(0,0,0,0.3)' : '#333',
                  color: isActive ? '#fff' : '#aaa',
                  padding: '1px 6px', borderRadius: 8,
                }}>{t.viz ? 'VIZ' : 'DATA'}</span>
              </button>
            );
          })}
        </nav>

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: 24, width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '8px 12px', background: '#222', color: '#ccc',
            border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 13,
          }}
        >
          <FaArrowLeft /> Dashboard
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ margin: 0, color: '#b8860b', fontSize: 26 }}>Brewery Custom Views</h1>
          <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
            Synthesized panels powered by <code>/api/custom-views</code>.
          </div>
        </div>

        {active === 'fermentation' && <FermentationTimeline />}
        {active === 'tanks' && <TankStatusBoard />}
        {active === 'batch-pdf' && <BatchRecordPDF />}
        {active === 'recipe' && <RecipeEditor />}
      </main>
    </div>
  );
}
