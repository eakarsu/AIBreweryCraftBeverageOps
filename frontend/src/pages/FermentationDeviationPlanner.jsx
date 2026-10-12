import React, { useState } from 'react';
import { generateFermentationDeviationPlan } from '../services/api';
import FormattedAIReport from '../components/FormattedAIReport';

export default function FermentationDeviationPlanner() {
  const [form, setForm] = useState({ batch_id: '', target_temp_f: 68, actual_temp_f: 73, target_gravity: 1.018, actual_gravity: 1.026, hours_since_pitch: 42 });
  const [result, setResult] = useState(null);
  const [notice, setNotice] = useState('');
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const scenarios = [
    { label: 'Warm fermentation', target_temp_f: 68, actual_temp_f: 73, target_gravity: 1.018, actual_gravity: 1.026, hours_since_pitch: 42 },
    { label: 'Slow attenuation', target_temp_f: 66, actual_temp_f: 65, target_gravity: 1.012, actual_gravity: 1.022, hours_since_pitch: 72 },
    { label: 'Late gravity drift', target_temp_f: 67, actual_temp_f: 69, target_gravity: 1.015, actual_gravity: 1.019, hours_since_pitch: 96 },
  ];
  const run = async () => {
    if (!String(form.batch_id).trim()) { setNotice('Enter an actual batch ID before planning recovery.'); return; }
    setNotice('');
    setResult((await generateFermentationDeviationPlan(form)).data);
  };

  return (
    <div className="page-container">
      <div className="page-header"><h1>Fermentation Deviation Planner</h1></div>
      <div className="form-card">
        <div className="ai-preset-bar"><div><strong>Fill example measurements</strong><p>Choose a scenario, then enter your actual batch ID. Examples do not run the planner.</p></div><div className="ai-actions">{scenarios.map((scenario) => <button key={scenario.label} type="button" className="btn btn-secondary" onClick={() => { const { label, ...measurements } = scenario; setForm((current) => ({ ...current, ...measurements })); setResult(null); setNotice('Enter an actual batch ID before planning recovery.'); }}>{scenario.label}</button>)}</div></div>
        {Object.entries(form).map(([key, value]) => (
          <div className="form-group" key={key}>
            <label>{key}</label>
            <input value={value} onChange={(e) => update(key, e.target.value)} />
          </div>
        ))}
        {notice && <p role="status">{notice}</p>}
        <button type="button" className="btn btn-primary" onClick={run}>Plan Recovery</button>
      </div>
      {result && <FormattedAIReport response={result} title="Fermentation deviation plan" />}
    </div>
  );
}
