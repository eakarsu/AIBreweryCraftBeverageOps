import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaCopy, FaRobot } from 'react-icons/fa';
import {
  generateRecipeSuggestion,
  generateTastingNotes,
  generateFoodPairing,
  generateDemandForecast,
  generateQualityAnalysis,
  generateLabelCopy,
  generateEventContent,
  generateBrewDayAssist,
  generateYeastOptimizer,
  generateHopFreshness,
  generateWaterChemistry,
  generateCompetitionScore,
  generateCostOptimizer,
  generateSeasonalMenuPlanner,
  generateCarbonFootprint,
} from '../services/api';

const aiConfigs = {
  'recipe-suggestion': {
    title: 'Recipe Formulation AI',
    description: 'Get AI-powered recipe suggestions based on your desired beer style and flavor profile.',
    apiCall: generateRecipeSuggestion,
    fields: [
      {
        name: 'style',
        label: 'Beer Style',
        type: 'select',
        options: ['IPA', 'Pale Ale', 'Stout', 'Porter', 'Wheat Beer', 'Pilsner', 'Lager', 'Saison', 'Sour', 'Belgian Dubbel', 'Belgian Tripel', 'Amber Ale', 'Brown Ale', 'Barleywine', 'Kolsch', 'Hefeweizen', 'ESB', 'Scottish Ale', 'Red Ale', 'Cream Ale'],
      },
      { name: 'abv_target', label: 'Target ABV (%)', type: 'number', step: '0.1', placeholder: 'e.g. 6.5' },
      { name: 'flavor_profile', label: 'Desired Flavor Profile', type: 'textarea', placeholder: 'Describe your desired flavors, e.g. citrusy, tropical hops with a malty backbone and moderate bitterness...' },
    ],
  },
  'tasting-notes': {
    title: 'Tasting Notes AI',
    description: 'Generate professional tasting notes for your beers to use on menus, websites, and marketing.',
    apiCall: generateTastingNotes,
    fields: [
      { name: 'beer_name', label: 'Beer Name', type: 'text', placeholder: 'e.g. Sunset Haze IPA' },
      { name: 'style', label: 'Style', type: 'text', placeholder: 'e.g. New England IPA' },
      { name: 'abv', label: 'ABV (%)', type: 'number', step: '0.1', placeholder: 'e.g. 6.8' },
      { name: 'appearance', label: 'Appearance', type: 'textarea', placeholder: 'Describe the appearance: color, clarity, head...' },
      { name: 'aroma', label: 'Aroma', type: 'textarea', placeholder: 'Describe the aroma notes...' },
      { name: 'flavor', label: 'Flavor', type: 'textarea', placeholder: 'Describe the flavor characteristics...' },
    ],
  },
  'food-pairing': {
    title: 'Food Pairing AI',
    description: 'Get expert food pairing recommendations for your beers.',
    apiCall: generateFoodPairing,
    fields: [
      { name: 'beer_name', label: 'Beer Name', type: 'text', placeholder: 'e.g. Amber Waves' },
      { name: 'style', label: 'Style', type: 'text', placeholder: 'e.g. American Amber Ale' },
      { name: 'flavor_profile', label: 'Flavor Profile', type: 'textarea', placeholder: 'Describe the beer flavors: caramel malt, subtle citrus hops...' },
    ],
  },
  'demand-forecast': {
    title: 'Demand Forecast AI',
    description: 'Forecast demand for your beer SKUs based on historical data and seasonal trends.',
    apiCall: generateDemandForecast,
    fields: [
      { name: 'beer_name', label: 'Beer / SKU Name', type: 'text', placeholder: 'e.g. Flagship IPA 6-pack' },
      { name: 'historical_sales', label: 'Historical Sales Data', type: 'textarea', placeholder: 'Enter monthly sales data, e.g.:\nJan: 500 cases\nFeb: 480 cases\nMar: 620 cases...' },
      {
        name: 'season',
        label: 'Upcoming Season',
        type: 'select',
        options: ['Spring', 'Summer', 'Fall', 'Winter'],
      },
      { name: 'events', label: 'Upcoming Events / Factors', type: 'textarea', placeholder: 'Any events or factors that may affect demand...' },
    ],
  },
  'quality-analysis': {
    title: 'Quality Analysis AI',
    description: 'AI-powered root cause analysis for quality deviations in your brewing process.',
    apiCall: generateQualityAnalysis,
    fields: [
      { name: 'batch_id', label: 'Batch ID', type: 'text', placeholder: 'e.g. BATCH-2024-156' },
      { name: 'parameters', label: 'Quality Parameters', type: 'textarea', placeholder: 'Enter measured parameters:\npH: 4.8\nFG: 1.018\nDO: 45ppb\nDiacetyl: detected...' },
      { name: 'deviations', label: 'Observed Deviations', type: 'textarea', placeholder: 'Describe what went wrong or what deviations were noticed...' },
    ],
  },
  'label-copy': {
    title: 'Label Copy AI',
    description: 'Generate compelling label copy and descriptions for your beer labels and packaging.',
    apiCall: generateLabelCopy,
    fields: [
      { name: 'beer_name', label: 'Beer Name', type: 'text', placeholder: 'e.g. Midnight Stout' },
      { name: 'style', label: 'Style', type: 'text', placeholder: 'e.g. Imperial Stout' },
      { name: 'abv', label: 'ABV (%)', type: 'number', step: '0.1', placeholder: 'e.g. 9.2' },
      { name: 'description', label: 'Beer Description / Key Notes', type: 'textarea', placeholder: 'Describe the beer: rich chocolate, coffee, smooth...' },
      { name: 'brewery_name', label: 'Brewery Name', type: 'text', placeholder: 'e.g. Ironworks Brewing Co.' },
    ],
  },
  'event-content': {
    title: 'Event Content AI',
    description: 'Generate marketing content for your brewery events and promotions.',
    apiCall: generateEventContent,
    fields: [
      {
        name: 'event_type',
        label: 'Event Type',
        type: 'select',
        options: ['Beer Release', 'Tap Takeover', 'Food Truck Rally', 'Live Music', 'Trivia Night', 'Beer Dinner', 'Homebrew Competition', 'Anniversary Party', 'Holiday Event', 'Fundraiser', 'Tour & Tasting'],
      },
      { name: 'event_name', label: 'Event Name', type: 'text', placeholder: 'e.g. Summer Solstice Sour Fest' },
      { name: 'date', label: 'Event Date', type: 'date' },
      { name: 'details', label: 'Event Details', type: 'textarea', placeholder: 'Describe the event details, special features, participating vendors...' },
    ],
  },
  // === 8 NEW AI TOOLS (per audit) ===
  'brew-day-assist': {
    title: 'Brew Day Assistant AI',
    description: 'Real-time guidance during brew session; alerts on temp/timing deviations.',
    apiCall: generateBrewDayAssist,
    fields: [
      { name: 'batch_id', label: 'Batch ID', type: 'text' },
      { name: 'current_step', label: 'Current Step', type: 'text', placeholder: 'mashing, sparging, boil, whirlpool, fermentation' },
      { name: 'target_temp', label: 'Target Temp (F)', type: 'number' },
      { name: 'actual_temp', label: 'Actual Temp (F)', type: 'number' },
      { name: 'target_time', label: 'Target Time (min)', type: 'number' },
      { name: 'actual_time', label: 'Actual Time (min)', type: 'number' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'yeast-optimizer': {
    title: 'Yeast Performance Optimizer',
    description: 'Predict fermentation outcome and recommend pitch rate.',
    apiCall: generateYeastOptimizer,
    fields: [
      { name: 'yeast_strain', label: 'Yeast Strain', type: 'text', placeholder: 'e.g. WLP001, Wyeast 1056' },
      { name: 'og', label: 'Original Gravity', type: 'number', step: '0.001' },
      { name: 'fermentation_temp', label: 'Fermentation Temp (F)', type: 'number' },
      { name: 'batch_size_bbl', label: 'Batch Size (BBL)', type: 'number', step: '0.5' },
      { name: 'target_abv', label: 'Target ABV (%)', type: 'number', step: '0.1' },
      { name: 'beer_style', label: 'Beer Style', type: 'text' },
    ],
  },
  'hop-freshness': {
    title: 'Hop Freshness Calculator',
    description: 'Calculate alpha-acid degradation and dose adjustments.',
    apiCall: generateHopFreshness,
    fields: [
      { name: 'hop_variety', label: 'Hop Variety', type: 'text' },
      { name: 'harvest_date', label: 'Harvest Date', type: 'date' },
      { name: 'storage_condition', label: 'Storage Condition', type: 'text', placeholder: 'cold/sealed, room temp, etc.' },
      { name: 'original_alpha_acid_pct', label: 'Original AA%', type: 'number', step: '0.1' },
      { name: 'recipe_target_ibu', label: 'Recipe Target IBU', type: 'number' },
    ],
  },
  'water-chemistry': {
    title: 'Water Chemistry Customizer',
    description: 'Salt additions to match target water profile per style.',
    apiCall: generateWaterChemistry,
    fields: [
      { name: 'source_water_profile', label: 'Source Water Profile (mg/L)', type: 'textarea', placeholder: 'Ca: 50, Mg: 5, Na: 10, Cl: 20, SO4: 30, HCO3: 80' },
      { name: 'target_style', label: 'Target Style', type: 'text', placeholder: 'e.g. West Coast IPA, Czech Pilsner' },
      { name: 'batch_size_bbl', label: 'Batch Size (BBL)', type: 'number', step: '0.5' },
    ],
  },
  'competition-score': {
    title: 'Competition Score Predictor',
    description: 'Estimate BJCP competition score and category feedback.',
    apiCall: generateCompetitionScore,
    fields: [
      { name: 'beer_name', label: 'Beer Name', type: 'text' },
      { name: 'style', label: 'Style', type: 'text', placeholder: 'BJCP style code or name' },
      { name: 'og', label: 'OG', type: 'number', step: '0.001' },
      { name: 'fg', label: 'FG', type: 'number', step: '0.001' },
      { name: 'abv', label: 'ABV (%)', type: 'number', step: '0.1' },
      { name: 'ibu', label: 'IBU', type: 'number' },
      { name: 'srm', label: 'SRM', type: 'number' },
      { name: 'aroma_notes', label: 'Aroma Notes', type: 'textarea' },
      { name: 'flavor_notes', label: 'Flavor Notes', type: 'textarea' },
      { name: 'mouthfeel', label: 'Mouthfeel', type: 'textarea' },
    ],
  },
  'cost-optimizer': {
    title: 'Ingredient Cost Optimizer',
    description: 'Find substitutions that maintain flavor and reduce cost.',
    apiCall: generateCostOptimizer,
    fields: [
      { name: 'style', label: 'Beer Style', type: 'text' },
      { name: 'recipe_grain_bill', label: 'Grain Bill', type: 'textarea', placeholder: '2-row 80%, Crystal 60L 8%, etc.' },
      { name: 'recipe_hop_schedule', label: 'Hop Schedule', type: 'textarea', placeholder: 'Citra 60min 1oz, Mosaic 5min 2oz, etc.' },
      { name: 'current_cost_per_bbl', label: 'Current Cost / BBL ($)', type: 'number', step: '0.01' },
      { name: 'target_savings_pct', label: 'Target Savings (%)', type: 'number', step: '1' },
    ],
  },
  'seasonal-menu-planner': {
    title: 'Seasonal Menu Planner',
    description: '12-month seasonal rotation tailored to climate, region, and capacity.',
    apiCall: generateSeasonalMenuPlanner,
    fields: [
      { name: 'climate', label: 'Climate', type: 'text', placeholder: 'temperate, tropical, cold, etc.' },
      { name: 'region', label: 'Region', type: 'text', placeholder: 'Pacific NW, Northeast, etc.' },
      { name: 'taproom_capacity_bbl_per_month', label: 'Capacity (BBL/month)', type: 'number' },
      { name: 'current_lineup', label: 'Current Lineup', type: 'textarea' },
      { name: 'local_events', label: 'Local Events', type: 'textarea' },
    ],
  },
  'carbon-footprint': {
    title: 'Carbon Footprint Tracker',
    description: 'Estimate brewery carbon footprint and recommend reductions.',
    apiCall: generateCarbonFootprint,
    fields: [
      { name: 'annual_production_bbl', label: 'Annual Production (BBL)', type: 'number' },
      { name: 'energy_source', label: 'Energy Source', type: 'text', placeholder: 'grid, solar, mix' },
      { name: 'packaging_mix', label: 'Packaging Mix', type: 'text', placeholder: '60% can, 30% keg, 10% bottle' },
      { name: 'transportation_radius_miles', label: 'Distribution Radius (miles)', type: 'number' },
      { name: 'water_usage_gal_per_bbl', label: 'Water Usage (gal/BBL)', type: 'number' },
    ],
  },
};

function formatAIResponse(text) {
  if (!text) return '';
  if (typeof text === 'object') {
    text = formatObjectToText(text);
  }
  let html = String(text);
  // Convert markdown-like headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Bullet points
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');
  // Numbered lists
  html = html.replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, (match) => {
    if (!match.includes('<ul>')) return `<ul>${match}</ul>`;
    return match;
  });
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  // Paragraphs - convert double newlines to paragraph breaks
  html = html.replace(/\n\n/g, '</p><p>');
  // Single newlines to <br> (except within already-processed tags)
  html = html.replace(/\n/g, '<br>');
  // Wrap in paragraph if not starting with a tag
  if (!html.startsWith('<')) {
    html = `<p>${html}</p>`;
  }
  return html;
}

function formatObjectToText(obj, depth = 0) {
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object' || obj === null) return String(obj ?? '');
  if (Array.isArray(obj)) {
    return obj.map((item) => {
      if (typeof item === 'string') return `- ${item}`;
      return formatObjectToText(item, depth + 1);
    }).join('\n');
  }
  const lines = [];
  for (const [key, value] of Object.entries(obj)) {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      if (depth === 0) {
        lines.push(`## ${label}\n${value}`);
      } else {
        lines.push(`**${label}:** ${value}`);
      }
    } else if (Array.isArray(value)) {
      lines.push(`## ${label}`);
      value.forEach((item) => {
        if (typeof item === 'string' || typeof item === 'number') {
          lines.push(`- ${item}`);
        } else if (typeof item === 'object' && item !== null) {
          lines.push(formatObjectToText(item, depth + 1));
          lines.push('');
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`## ${label}`);
      lines.push(formatObjectToText(value, depth + 1));
    }
  }
  return lines.join('\n');
}

function AIFeaturePage() {
  const { aiFeature } = useParams();
  const navigate = useNavigate();
  const config = aiConfigs[aiFeature];

  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [rawResult, setRawResult] = useState('');
  const [structuredResult, setStructuredResult] = useState(null);

  if (!config) {
    return (
      <div className="page-container">
        <p>AI Feature not found: {aiFeature}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handleFieldChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setStructuredResult(null);
    try {
      const res = await config.apiCall(formData);
      const data = res.data;

      // Check for structured (parsed) JSON output first
      const innerData = data?.data;
      if (innerData?.parsed && typeof innerData.parsed === 'object' && !innerData.parsed.content && !innerData.parsed.raw) {
        setStructuredResult(innerData.parsed);
      } else if (data?.data?.result && typeof data.data.result === 'object' && !data.data.result.raw) {
        setStructuredResult(data.data.result);
      }

      // Extract display text
      let aiText = '';
      if (typeof data === 'string') {
        aiText = data;
      } else if (innerData?.content && typeof innerData.content === 'string') {
        aiText = innerData.content;
      } else if (innerData?.result) {
        aiText = typeof innerData.result === 'string' ? innerData.result : formatObjectToText(innerData.result);
      } else if (data?.result) {
        aiText = typeof data.result === 'string' ? data.result : formatObjectToText(data.result);
      } else if (data?.data) {
        aiText = typeof data.data === 'string' ? data.data : formatObjectToText(data.data);
      } else if (data?.content) {
        aiText = typeof data.content === 'string' ? data.content : formatObjectToText(data.content);
      } else {
        aiText = formatObjectToText(data);
      }
      setRawResult(aiText);
      setResult(formatAIResponse(aiText));
      toast.success('AI response generated!');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to generate AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rawResult).then(() => {
      toast.success('Copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy');
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>
          <button className="btn btn-icon" onClick={() => navigate('/dashboard')}>
            <FaArrowLeft />
          </button>
          <FaRobot className="icon" />
          {config.title}
        </h1>
      </div>

      <p style={{ marginBottom: '2rem', maxWidth: '700px' }}>{config.description}</p>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: '2rem', alignItems: 'start' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Input Parameters</h3>
          <form onSubmit={handleGenerate}>
            {config.fields.map((field) => (
              <div className="form-group" key={field.name}>
                <label>{field.label}</label>
                {field.type === 'select' ? (
                  <select
                    className="form-control"
                    value={formData[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                  >
                    <option value="">Select...</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    className="form-control"
                    value={formData[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder || ''}
                    rows={4}
                  />
                ) : (
                  <input
                    type={field.type}
                    className="form-control"
                    value={formData[field.name] || ''}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    placeholder={field.placeholder || ''}
                    step={field.step}
                  />
                )}
              </div>
            ))}
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', display: 'inline-block', verticalAlign: 'middle' }}></span>
                  Generating...
                </>
              ) : (
                <>
                  <FaRobot /> Generate with AI
                </>
              )}
            </button>
          </form>
        </div>

        <div>
          {loading && (
            <div className="card" style={{ padding: '2rem' }}>
              <div className="ai-loading">
                <div className="ai-loading-icon">&#127866;</div>
                <p style={{ color: 'var(--text-secondary)' }}>Brewing your AI response...</p>
                <div className="ai-loading-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="ai-output-container">
              <div className="ai-output-inner">
                <div className="ai-badge">
                  <span>AI Generated</span>
                </div>

                {/* Structured JSON output panel */}
                {structuredResult && (
                  <details style={{ marginBottom: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '0.75rem' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '600', color: 'var(--accent-gold)', fontSize: '0.875rem' }}>
                      Structured Data (JSON)
                    </summary>
                    <pre style={{ marginTop: '0.75rem', fontSize: '0.78rem', overflow: 'auto', maxHeight: '400px', whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
                      {JSON.stringify(structuredResult, null, 2)}
                    </pre>
                  </details>
                )}

                <div
                  className="ai-output-content"
                  dangerouslySetInnerHTML={{ __html: result }}
                />
                <div className="ai-output-actions">
                  <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                    <FaCopy /> Copy to Clipboard
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIFeaturePage;
