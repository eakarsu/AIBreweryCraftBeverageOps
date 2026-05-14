const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');
const { callOpenRouter, parseAIJson, saveAIResult, DEFAULT_MODEL } = require('../lib/aiHelpers');

// Ensure quality_predictions table
async function ensureQualityPredictionsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quality_predictions (
      id SERIAL PRIMARY KEY,
      batch_id INTEGER NOT NULL,
      quality_score INTEGER,
      flavor_profile TEXT,
      potential_issues TEXT,
      raw_response TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

async function logAI(req, feature, input, raw_text, output) {
  await saveAIResult(pool, {
    user_id: req.user?.id,
    feature,
    input,
    output: output ?? parseAIJson(raw_text),
    raw_text,
    model: DEFAULT_MODEL,
  });
}

// POST /api/ai/recipe-suggestion
router.post(
  '/recipe-suggestion',
  [
    body('style').optional().isString().isLength({ max: 100 }),
    body('abv_target').optional().isFloat({ min: 0, max: 30 }),
    body('flavor_profile').optional().isString().isLength({ max: 2000 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { style, abv_target, flavor_profile } = req.body;
      const systemPrompt = `You are a master brewer and beer formulation expert. Return a complete craft brewery recipe as valid JSON with this exact structure:
{"recipe_name":"string","style":"string","target_abv":0.0,"target_ibu":0,"grain_bill":[{"malt":"string","percentage":0,"weight_lbs_per_bbl":0}],"hop_schedule":[{"variety":"string","alpha_acid_pct":0,"amount_oz_per_bbl":0,"addition_time_min":0,"purpose":"string"}],"yeast":{"strain":"string","manufacturer":"string","pitch_rate":"string","fermentation_temp_f":0},"mash_profile":{"temperature_f":0,"duration_min":0,"water_to_grist_ratio":"string"},"water_chemistry":{"calcium_ppm":0,"chloride_ppm":0,"sulfate_ppm":0},"fermentation_timeline":{"primary_days":0,"diacetyl_rest_days":0,"cold_crash_days":0},"brewers_notes":"string","variations":["string"]}`;
      const userPrompt = `Create a detailed 5 BBL craft brewery recipe:
Style: ${style || 'Brewer choice'}
Target ABV: ${abv_target || 'Style appropriate'}
Flavor Profile: ${flavor_profile || 'Classic for the style'}`;
      const content = await callOpenRouter(systemPrompt, userPrompt, { temperature: 0.6 });
      const parsed = parseAIJson(content) || { content };
      await logAI(req, 'recipe-suggestion', { style, abv_target }, content, parsed);
      res.json({
        success: true,
        data: {
          title: `${style || parsed.style || 'Custom'} Recipe Suggestion`,
          content,
          parsed,
          suggestions: [
            'Adjust grain bill percentages based on your system efficiency',
            'Consider water chemistry adjustments for your local water profile',
            'Scale hop additions based on actual alpha acid percentages',
          ],
          metadata: { style, abv_target, flavor_profile },
        },
      });
    } catch (err) {
      console.error('AI recipe suggestion error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/tasting-notes
router.post(
  '/tasting-notes',
  [
    body('beer_name').optional().isString().isLength({ max: 200 }),
    body('style').optional().isString().isLength({ max: 100 }),
    body('abv').optional().isFloat({ min: 0, max: 30 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { beer_name, style, abv, appearance, aroma, flavor } = req.body;
      const systemPrompt = `You are a certified Cicerone and BJCP Grand Master beer judge. Return professional tasting notes as valid JSON:
{"tap_list_description":"1-2 sentence concise description","appearance":"string","aroma":"string","flavor":"string","mouthfeel":"string","overall_impression":"string","untappd_description":"2-3 sentences","pairing_suggestions":["string"],"bjcp_style_match":"string"}`;
      const userPrompt = `Write professional tasting notes:
Beer: ${beer_name || 'Unnamed'} | Style: ${style || 'Unknown'} | ABV: ${abv || 'Unknown'}%
Appearance: ${appearance || 'Not provided'}
Aroma: ${aroma || 'Not provided'}
Flavor: ${flavor || 'Not provided'}`;
      const content = await callOpenRouter(systemPrompt, userPrompt, { temperature: 0.7 });
      const parsed = parseAIJson(content) || { content };
      await logAI(req, 'tasting-notes', { beer_name, style }, content, parsed);
      res.json({
        success: true,
        data: {
          title: `Tasting Notes: ${beer_name || style || 'Beer'}`,
          content,
          parsed,
          suggestions: [
            'Use the tap_list_description for menus',
            'Full notes work well for website and social media',
            'Use untappd_description for the Untappd check-in',
          ],
          metadata: { beer_name, style, abv },
        },
      });
    } catch (err) {
      console.error('AI tasting notes error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/food-pairing
router.post('/food-pairing',
  [
    body('beer_name').optional().isString().isLength({ max: 200 }),
    body('style').optional().isString().isLength({ max: 100 }),
    body('flavor_profile').optional().isString().isLength({ max: 1000 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { beer_name, style, flavor_profile } = req.body;
      const systemPrompt = `You are a culinary expert and certified Cicerone specializing in beer and food pairing. Return pairing recommendations as valid JSON:
{"top_dish_pairings":[{"dish":"string","explanation":"string","pairing_type":"complementary|contrasting|cut"}],"cheese_pairings":[{"cheese":"string","rationale":"string"}],"taproom_snacks":["string"],"foods_to_avoid":[{"food":"string","reason":"string"}],"flight_progression":["string"],"pairing_principle":"string"}`;
      const userPrompt = `Suggest food pairings for: ${beer_name || style || 'craft beer'} | Style: ${style || 'Unknown'} | Flavor: ${flavor_profile || 'Classic'}`;
      const content = await callOpenRouter(systemPrompt, userPrompt, { temperature: 0.7 });
      const parsed = parseAIJson(content) || { content };
      await logAI(req, 'food-pairing', { beer_name, style }, content, parsed);
      res.json({
        success: true,
        data: {
          title: `Food Pairings: ${beer_name || style || 'Beer'}`,
          content,
          parsed,
          suggestions: [
            'Start with lighter pairings and progress to more intense flavors',
            'Consider seasonal availability of ingredients',
            'Offer small tasting portions for pairing events',
          ],
          metadata: { beer_name, style, flavor_profile },
        },
      });
    } catch (err) {
      console.error('AI food pairing error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/demand-forecast
router.post('/demand-forecast',
  [
    body('beer_name').optional().isString().isLength({ max: 200 }),
    body('season').optional().isIn(['Spring', 'Summer', 'Fall', 'Winter']),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { beer_name, historical_sales, season, events } = req.body;
      const systemPrompt = `You are a brewery demand planning expert. Return a structured forecast as valid JSON:
{"weekly_forecast":[{"week":1,"demand_bbl":0,"confidence":"low|medium|high","notes":"string"},{"week":2,"demand_bbl":0,"confidence":"string","notes":"string"},{"week":3,"demand_bbl":0,"confidence":"string","notes":"string"},{"week":4,"demand_bbl":0,"confidence":"string","notes":"string"}],"recommended_production_bbl":0,"optimal_brew_date_days_from_now":0,"channel_allocation":{"taproom_pct":0,"distribution_pct":0,"events_pct":0},"min_stock_bbl":0,"max_stock_bbl":0,"risk_factors":["string"],"forecast_summary":"string"}`;
      const userPrompt = `Demand forecast for: ${beer_name || 'craft beer'} | Season: ${season || 'current'} | Historical: ${historical_sales ? JSON.stringify(historical_sales) : 'not provided'} | Events: ${events ? JSON.stringify(events) : 'none'}`;
      const content = await callOpenRouter(systemPrompt, userPrompt, { temperature: 0.5 });
      const parsed = parseAIJson(content) || { content };
      await logAI(req, 'demand-forecast', { beer_name, season }, content, parsed);
      res.json({
        success: true,
        data: {
          title: `Demand Forecast: ${beer_name || 'Production Planning'}`,
          content,
          parsed,
          suggestions: [
            'Review forecast weekly and adjust based on actual sales',
            'Consider building safety stock for high-demand periods',
            'Track forecast accuracy to improve future predictions',
          ],
          metadata: { beer_name, season, events },
        },
      });
    } catch (err) {
      console.error('AI demand forecast error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/quality-analysis
router.post('/quality-analysis',
  [
    body('batch_id').optional().isString().isLength({ max: 100 }),
    body('deviations').optional().isString().isLength({ max: 2000 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { batch_id, parameters, deviations } = req.body;
      const systemPrompt = `You are a brewery QA manager and fermentation scientist. Return a structured quality analysis as valid JSON:
{"overall_verdict":"release|hold|blend|dump","confidence":"low|medium|high","issues":[{"deviation":"string","severity":"critical|major|minor","root_cause":"string","corrective_action":"string","preventive_action":"string"}],"additional_tests":["string"],"estimated_salvage_probability_pct":0,"process_improvements":["string"],"summary":"string"}`;
      const userPrompt = `Quality analysis for batch ${batch_id || 'unknown'}:
Parameters: ${parameters ? JSON.stringify(parameters) : 'Not provided'}
Deviations: ${deviations || 'Not specified'}`;
      const content = await callOpenRouter(systemPrompt, userPrompt, { temperature: 0.4 });
      const parsed = parseAIJson(content) || { content };
      await logAI(req, 'quality-analysis', { batch_id }, content, parsed);
      res.json({
        success: true,
        data: {
          title: `Quality Analysis: Batch ${batch_id || 'Unknown'}`,
          content,
          parsed,
          suggestions: [
            'Document all findings in batch records',
            'Schedule follow-up testing as recommended',
            'Review CIP procedures if contamination is suspected',
          ],
          metadata: { batch_id, parameters, deviations },
        },
      });
    } catch (err) {
      console.error('AI quality analysis error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/label-copy
router.post('/label-copy',
  [
    body('beer_name').optional().isString().isLength({ max: 200 }),
    body('style').optional().isString().isLength({ max: 100 }),
    body('abv').optional().isFloat({ min: 0, max: 30 }),
    body('brewery_name').optional().isString().isLength({ max: 200 }),
    body('description').optional().isString().isLength({ max: 2000 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { beer_name, style, abv, description, brewery_name } = req.body;
      const systemPrompt = `You are a craft beverage marketing copywriter. Return label copy as valid JSON:
{"front_label_copy":"15-25 words max","back_label_copy":"50-75 words","tagline":"5-8 words","alternative_taglines":["string","string","string"],"social_media_caption":"string","untappd_description":"2-3 sentences","ttb_compliance_note":"string"}`;
      const userPrompt = `Label copy for: ${beer_name || 'Beer'} | Style: ${style || 'Unknown'} | ABV: ${abv || 'N/A'}% | Brewery: ${brewery_name || 'Unknown'} | Story: ${description || 'Not provided'}`;
      const content = await callOpenRouter(systemPrompt, userPrompt, { temperature: 0.8 });
      const parsed = parseAIJson(content) || { content };
      await logAI(req, 'label-copy', { beer_name, style }, content, parsed);
      res.json({
        success: true,
        data: {
          title: `Label Copy: ${beer_name || 'Beer'}`,
          content,
          parsed,
          suggestions: [
            'Have legal review all copy for TTB compliance',
            'Test taglines with taproom customers before printing',
            'Ensure ABV and volume are prominently displayed as required',
          ],
          metadata: { beer_name, style, abv, brewery_name },
        },
      });
    } catch (err) {
      console.error('AI label copy error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/event-content
router.post('/event-content',
  [
    body('event_type').optional().isString().isLength({ max: 100 }),
    body('event_name').optional().isString().isLength({ max: 200 }),
    body('details').optional().isString().isLength({ max: 2000 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { event_type, event_name, date, details } = req.body;
      const systemPrompt = `You are a brewery events and marketing coordinator. Return marketing content as valid JSON:
{"website_description":"150-200 words","facebook_description":"100-150 words","instagram_caption":"string with hashtags","email_blurb":"75-100 words","sms_notification":"max 160 chars","press_release_paragraph":"string","day_of_post":"string","promotional_timeline":[{"days_before":0,"action":"string","platform":"string"}]}`;
      const userPrompt = `Event content for: ${event_name || event_type || 'Brewery Event'} | Type: ${event_type || 'event'} | Date: ${date || 'TBD'} | Details: ${details || 'Not provided'}`;
      const content = await callOpenRouter(systemPrompt, userPrompt, { temperature: 0.8 });
      const parsed = parseAIJson(content) || { content };
      await logAI(req, 'event-content', { event_type, event_name, date }, content, parsed);
      res.json({
        success: true,
        data: {
          title: `Event Content: ${event_name || event_type || 'Event'}`,
          content,
          parsed,
          suggestions: [
            'Schedule posts according to the suggested promotional_timeline',
            'Include event photos or graphics with each post',
            'Create a Facebook event and invite your followers',
          ],
          metadata: { event_type, event_name, date },
        },
      });
    } catch (err) {
      console.error('AI event content error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// POST /api/ai/predict-quality - predict batch quality using AI
router.post('/predict-quality', async (req, res) => {
  try {
    const { batch_id } = req.body;
    if (!batch_id) return res.status(400).json({ error: 'batch_id is required' });

    await ensureQualityPredictionsTable();

    let batchParams = null;
    try {
      const batchResult = await pool.query('SELECT * FROM batches WHERE id = $1', [batch_id]);
      if (batchResult.rows.length > 0) batchParams = batchResult.rows[0];
    } catch (e) {}
    if (!batchParams) {
      try {
        const logResult = await pool.query('SELECT * FROM brew_logs WHERE id = $1 OR batch_id = $2', [batch_id, String(batch_id)]);
        if (logResult.rows.length > 0) batchParams = logResult.rows[0];
      } catch (e) {}
    }

    const systemPrompt = `You are a brewing quality expert and fermentation scientist. Analyze batch parameters and predict the final beer quality. Return your response as valid JSON with exactly these keys: quality_score (integer 0-100), flavor_profile (string description), potential_issues (array of strings). Example: {"quality_score": 82, "flavor_profile": "Tropical, citrus forward with clean finish", "potential_issues": ["Slight oxidation risk", "Monitor diacetyl"]}`;

    const paramsText = batchParams
      ? `Batch ID: ${batch_id}
Recipe: ${batchParams.recipe_name || 'Unknown'}
Style: ${batchParams.style || 'Unknown'}
OG: ${batchParams.og || 'Unknown'}
FG: ${batchParams.fg || 'Unknown'}
ABV: ${batchParams.abv || 'Unknown'}
IBU: ${batchParams.ibu || 'Unknown'}
Yeast: ${batchParams.yeast_strain || batchParams.yeast || 'Unknown'}
Fermentation Temp: ${batchParams.fermentation_temp || 'Unknown'}
Status: ${batchParams.status || 'Unknown'}
Notes: ${batchParams.notes || 'None'}`
      : `Batch ID: ${batch_id} - No detailed parameters found. Provide general assessment.`;

    const content = await callOpenRouter(systemPrompt, `Predict quality for this batch:\n${paramsText}`);

    // 3-strategy JSON parse
    const parsed = parseAIJson(content);
    const qualityScore = parsed?.quality_score ?? null;
    const flavorProfile = parsed?.flavor_profile ?? content;
    const potentialIssues = Array.isArray(parsed?.potential_issues)
      ? parsed.potential_issues.join('; ')
      : (parsed?.potential_issues ?? null);

    const saved = await pool.query(
      `INSERT INTO quality_predictions (batch_id, quality_score, flavor_profile, potential_issues, raw_response)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [batch_id, qualityScore, flavorProfile, potentialIssues, content]
    );

    await logAI(req, 'predict-quality', { batch_id }, content, parsed);

    res.json({
      success: true,
      data: {
        prediction: saved.rows[0],
        quality_score: qualityScore,
        flavor_profile: flavorProfile,
        potential_issues: potentialIssues ? potentialIssues.split('; ') : [],
        raw_response: content,
      },
    });
  } catch (err) {
    console.error('AI quality prediction error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/seasonal-planner
router.post('/seasonal-planner',
  [body('month').notEmpty().withMessage('month is required (1-12 or month name)')],
  handleValidation,
  async (req, res) => {
    try {
      const { month, target_style } = req.body;
      const systemPrompt = `You are an expert craft brewery recipe developer. Return seasonal recipe recommendations as valid JSON:
{"month":${JSON.stringify(month)},"seasonal_recipes":[{"name":"string","style":"string","key_seasonal_ingredients":["string"],"why_it_works":"string","expected_abv":0.0,"expected_ibu":0}],"ingredient_adjustments":["string"],"fermentation_temp_advice":"string","demand_forecast":"string","limited_release_ideas":["string"]}`;
      const userPrompt = `Seasonal brewing recommendations for month: ${month}, target style: ${target_style || 'brewer choice'}`;
      const content = await callOpenRouter(systemPrompt, userPrompt, { temperature: 0.7 });
      const parsed = parseAIJson(content) || { content };
      await logAI(req, 'seasonal-planner', { month, target_style }, content, parsed);
      res.json({
        success: true,
        data: {
          title: `Seasonal Recipe Planner: Month ${month}`,
          content,
          parsed,
          month,
          target_style,
          suggestions: [
            'Plan brew dates 6-8 weeks before peak seasonal demand',
            'Source seasonal ingredients early to ensure availability',
            'Consider small pilot batches before committing full production',
          ],
        },
      });
    } catch (err) {
      console.error('AI seasonal planner error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// ============================================================================
// NEW AI FEATURES (per audit: 8 advanced AI tools)
// ============================================================================

// 1) POST /api/ai/brew-day-assist - Brew Day Assistant AI
router.post('/brew-day-assist', async (req, res) => {
  try {
    const { batch_id, current_step, target_temp, actual_temp, target_time, actual_time, notes } = req.body;
    const systemPrompt = `You are a brew-day operations assistant. Given the current brewing step and observed vs target parameters, return JSON: {"alert_level": "ok|warn|critical", "issues": [...], "next_actions": [...], "timing_advice": "string", "temperature_advice": "string", "estimated_impact_on_batch": "string"}`;
    const userPrompt = `Batch: ${batch_id}\nStep: ${current_step}\nTarget temp: ${target_temp}\nActual temp: ${actual_temp}\nTarget time: ${target_time}\nActual time: ${actual_time}\nNotes: ${notes || 'none'}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'brew-day-assist', { batch_id, current_step }, raw, parsed);
    res.json({ success: true, data: { result: parsed, raw } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 2) POST /api/ai/yeast-optimizer - Yeast Performance Optimizer
router.post('/yeast-optimizer', async (req, res) => {
  try {
    const { yeast_strain, og, fermentation_temp, batch_size_bbl, target_abv, beer_style } = req.body;
    if (!yeast_strain) return res.status(400).json({ error: 'yeast_strain is required' });
    const systemPrompt = `You are a fermentation scientist. Predict fermentation outcome and recommend pitch rate. Return JSON: {"recommended_pitch_rate_million_cells_per_ml": 0, "estimated_starter_size_l": 0, "expected_attenuation_pct": 0, "expected_diacetyl_risk": "low|medium|high", "fermentation_timeline_days": {"primary": 0, "diacetyl_rest": 0, "cold_crash": 0}, "warnings": [...], "recommendations": [...]}`;
    const userPrompt = `Yeast: ${yeast_strain}\nOG: ${og}\nFermentation Temp: ${fermentation_temp}F\nBatch Size: ${batch_size_bbl} BBL\nTarget ABV: ${target_abv}\nStyle: ${beer_style}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'yeast-optimizer', { yeast_strain, beer_style }, raw, parsed);
    res.json({ success: true, data: { result: parsed, raw } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 3) POST /api/ai/hop-freshness - Hop Freshness Calculator
router.post('/hop-freshness', async (req, res) => {
  try {
    const { hop_variety, harvest_date, storage_condition, original_alpha_acid_pct, recipe_target_ibu } = req.body;
    if (!hop_variety || !harvest_date) return res.status(400).json({ error: 'hop_variety and harvest_date required' });
    const systemPrompt = `You are a hop chemistry expert. Calculate alpha acid degradation since harvest and recommend utilization adjustments. Return JSON: {"months_since_harvest": 0, "estimated_alpha_acid_pct_now": 0, "degradation_factor": 0.0-1.0, "recommended_dose_adjustment_pct": 0, "freshness_grade": "A|B|C|D", "use_case_recommendations": [...], "storage_advice": [...]}`;
    const userPrompt = `Hop: ${hop_variety}\nHarvest date: ${harvest_date}\nStorage: ${storage_condition || 'cold/sealed'}\nOriginal AA%: ${original_alpha_acid_pct}\nTarget IBU: ${recipe_target_ibu}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'hop-freshness', { hop_variety, harvest_date }, raw, parsed);
    res.json({ success: true, data: { result: parsed, raw } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 4) POST /api/ai/water-chemistry - Water Chemistry Customizer
router.post('/water-chemistry', async (req, res) => {
  try {
    const { source_water_profile, target_style, batch_size_bbl } = req.body;
    if (!source_water_profile || !target_style) return res.status(400).json({ error: 'source_water_profile and target_style required' });
    const systemPrompt = `You are a brewing water chemistry expert. Calculate salt additions to match the target style profile. Return JSON: {"target_profile": {"Ca": 0, "Mg": 0, "Na": 0, "Cl": 0, "SO4": 0, "HCO3": 0}, "salt_additions_grams_per_bbl": {"gypsum": 0, "calcium_chloride": 0, "epsom": 0, "table_salt": 0, "baking_soda": 0, "chalk": 0}, "ph_target": 0.0, "lactic_acid_ml_per_bbl": 0, "warnings": [...], "rationale": "string"}`;
    const userPrompt = `Source water (mg/L): ${typeof source_water_profile === 'object' ? JSON.stringify(source_water_profile) : source_water_profile}\nTarget style: ${target_style}\nBatch size: ${batch_size_bbl || 5} BBL`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'water-chemistry', { target_style }, raw, parsed);
    res.json({ success: true, data: { result: parsed, raw } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 5) POST /api/ai/competition-score - Competition Score Predictor
router.post('/competition-score', async (req, res) => {
  try {
    const { beer_name, style, og, fg, abv, ibu, srm, aroma_notes, flavor_notes, mouthfeel } = req.body;
    if (!style) return res.status(400).json({ error: 'style is required' });
    const systemPrompt = `You are a BJCP Grand Master judge. Estimate the BJCP score (0-50) and category-specific feedback. Return JSON: {"estimated_score": 0, "score_breakdown": {"aroma": 0, "appearance": 0, "flavor": 0, "mouthfeel": 0, "overall_impression": 0}, "style_compliance": "low|medium|high", "strengths": [...], "weaknesses": [...], "judges_feedback": "string", "improvement_suggestions": [...]}`;
    const userPrompt = `Beer: ${beer_name}\nStyle: ${style}\nOG: ${og} FG: ${fg} ABV: ${abv} IBU: ${ibu} SRM: ${srm}\nAroma: ${aroma_notes}\nFlavor: ${flavor_notes}\nMouthfeel: ${mouthfeel}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'competition-score', { beer_name, style }, raw, parsed);
    res.json({ success: true, data: { result: parsed, raw } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 6) POST /api/ai/cost-optimizer - Ingredient Cost Optimizer
router.post('/cost-optimizer', async (req, res) => {
  try {
    const { recipe_grain_bill, recipe_hop_schedule, current_cost_per_bbl, target_savings_pct, style } = req.body;
    const systemPrompt = `You are a brewery procurement and recipe optimization expert. Suggest ingredient substitutions that maintain flavor profile while reducing cost. Return JSON: {"current_cost_per_bbl": 0, "target_cost_per_bbl": 0, "substitutions": [{"original": "...", "substitute": "...", "cost_savings_pct": 0, "flavor_impact": "minimal|noticeable|significant", "rationale": "..."}], "estimated_savings_pct": 0, "flavor_risk_assessment": "low|medium|high", "blind_taste_test_recommended": true|false}`;
    const userPrompt = `Style: ${style}\nGrain bill: ${typeof recipe_grain_bill === 'object' ? JSON.stringify(recipe_grain_bill) : recipe_grain_bill}\nHops: ${typeof recipe_hop_schedule === 'object' ? JSON.stringify(recipe_hop_schedule) : recipe_hop_schedule}\nCurrent cost/BBL: $${current_cost_per_bbl}\nTarget savings: ${target_savings_pct}%`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'cost-optimizer', { style, target_savings_pct }, raw, parsed);
    res.json({ success: true, data: { result: parsed, raw } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 7) POST /api/ai/seasonal-menu-planner - Seasonal Menu Planner (annual rotation)
router.post('/seasonal-menu-planner', async (req, res) => {
  try {
    const { climate, region, taproom_capacity_bbl_per_month, current_lineup, local_events } = req.body;
    const systemPrompt = `You are a brewery menu strategist. Build a 12-month seasonal rotation tailored to climate, region, and capacity. Return JSON: {"annual_rotation": [{"month": 1, "season": "winter", "featured_styles": [...], "limited_releases": [...], "demand_forecast_bbl": 0, "ingredient_lead_time_weeks": 0, "marketing_themes": [...]}], "year_long_event_tie_ins": [...], "recommendations": [...]}`;
    const userPrompt = `Climate: ${climate}\nRegion: ${region}\nCapacity: ${taproom_capacity_bbl_per_month} BBL/month\nCurrent lineup: ${current_lineup}\nLocal events: ${local_events}`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'seasonal-menu-planner', { climate, region }, raw, parsed);
    res.json({ success: true, data: { result: parsed, raw } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 8) POST /api/ai/carbon-footprint - Carbon Footprint Tracker
router.post('/carbon-footprint', async (req, res) => {
  try {
    const { annual_production_bbl, energy_source, packaging_mix, transportation_radius_miles, water_usage_gal_per_bbl } = req.body;
    if (!annual_production_bbl) return res.status(400).json({ error: 'annual_production_bbl required' });
    const systemPrompt = `You are a brewery sustainability analyst. Estimate carbon footprint and recommend efficiency improvements. Return JSON: {"estimated_kg_co2e_per_bbl": 0, "estimated_total_kg_co2e_per_year": 0, "breakdown_by_source": {"energy": 0, "packaging": 0, "transportation": 0, "water_treatment": 0, "ingredients": 0, "other": 0}, "industry_benchmark_kg_co2e_per_bbl": 0, "performance_rating": "below|at|above industry average", "improvement_recommendations": [{"action": "...", "estimated_reduction_pct": 0, "estimated_cost_usd": 0, "payback_months": 0}], "certifications_to_pursue": [...]}`;
    const userPrompt = `Annual production: ${annual_production_bbl} BBL\nEnergy source: ${energy_source}\nPackaging mix: ${packaging_mix}\nTransportation radius: ${transportation_radius_miles} miles\nWater: ${water_usage_gal_per_bbl} gal/BBL`;
    const raw = await callOpenRouter(systemPrompt, userPrompt);
    const parsed = parseAIJson(raw) || { raw };
    await logAI(req, 'carbon-footprint', { annual_production_bbl }, raw, parsed);
    res.json({ success: true, data: { result: parsed, raw } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/ai/results — paginated AI history (per user)
router.get('/results', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const feature = req.query.feature;
    const params = [req.user.id];
    let where = 'user_id = $1';
    if (feature) { params.push(feature); where += ` AND feature = $${params.length}`; }
    const cnt = await pool.query(`SELECT COUNT(*) FROM ai_results WHERE ${where}`, params);
    const total = parseInt(cnt.rows[0].count);
    params.push(limit); params.push(offset);
    const r = await pool.query(
      `SELECT id, feature, input, output, model, created_at FROM ai_results WHERE ${where}
       ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
