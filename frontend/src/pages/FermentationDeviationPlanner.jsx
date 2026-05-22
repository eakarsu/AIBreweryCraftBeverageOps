import React, { useState } from 'react';
import { generateFermentationDeviationPlan } from '../services/api';

export default function FermentationDeviationPlanner() {
  const [form, setForm] = useState({ batch_id: 'BATCH-IPA-104', target_temp_f: 68, actual_temp_f: 73, target_gravity: 1.018, actual_gravity: 1.026, hours_since_pitch: 42 });
  const [result, setResult] = useState(null);
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const run = async () => setResult((await generateFermentationDeviationPlan(form)).data);

  return (
    <div className="page-container">
      <div className="page-header"><h1>Fermentation Deviation Planner</h1></div>
      <div className="form-card">
        {Object.entries(form).map(([key, value]) => (
          <div className="form-group" key={key}>
            <label>{key}</label>
            <input value={value} onChange={(e) => update(key, e.target.value)} />
          </div>
        ))}
        <button className="btn btn-primary" onClick={run}>Plan Recovery</button>
      </div>
      {result && <pre className="result-card">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
