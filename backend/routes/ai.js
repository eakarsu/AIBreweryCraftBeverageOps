const router = require('express').Router();
const fetch = require('node-fetch');

async function callOpenRouter(systemPrompt, userPrompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  if (!data.choices || data.choices.length === 0) {
    throw new Error('No response from AI model');
  }

  return data.choices[0].message.content;
}

// POST /api/ai/recipe-suggestion
router.post('/recipe-suggestion', async (req, res) => {
  try {
    const { style, abv_target, flavor_profile } = req.body;

    const systemPrompt = `You are a master brewer and beer formulation expert with 20+ years of experience in craft brewing. You have deep knowledge of malt chemistry, hop utilization, yeast behavior, and water chemistry. When creating recipes, provide specific grain bills with percentages, hop schedules with exact timings and quantities, yeast recommendations, mash temperatures, and fermentation schedules. Always include practical brewing tips and potential variations. Format your response clearly with sections for Grain Bill, Hop Schedule, Yeast, Mash Profile, Fermentation, and Brewer's Notes.`;

    const userPrompt = `Create a detailed homebrew/craft brewery recipe for the following:
Style: ${style || 'Not specified'}
Target ABV: ${abv_target || 'Style appropriate'}
Desired Flavor Profile: ${flavor_profile || 'Classic for the style'}

Please provide a complete recipe formulation including grain bill (with percentages and weights for a 5 BBL batch), hop schedule (varieties, amounts, timing), yeast recommendation, mash temperature and duration, water chemistry targets, fermentation temperature and timeline, and any special techniques or ingredients.`;

    const content = await callOpenRouter(systemPrompt, userPrompt);

    res.json({
      success: true,
      data: {
        title: `${style || 'Custom'} Recipe Suggestion`,
        content,
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
});

// POST /api/ai/tasting-notes
router.post('/tasting-notes', async (req, res) => {
  try {
    const { beer_name, style, abv, appearance, aroma, flavor } = req.body;

    const systemPrompt = `You are a certified Cicerone and BJCP Grand Master beer judge with extensive experience writing professional tasting notes for craft breweries. Your tasting notes are vivid, precise, and follow industry-standard evaluation criteria. You use the BJCP scoring framework and describe beers using proper sensory terminology. Your notes should be suitable for brewery websites, Untappd descriptions, and tap room menus. Include aroma, appearance, flavor, mouthfeel, and overall impression sections.`;

    const userPrompt = `Write professional tasting notes for the following beer:
Beer Name: ${beer_name || 'Unnamed'}
Style: ${style || 'Not specified'}
ABV: ${abv || 'Unknown'}
Appearance Notes: ${appearance || 'Not provided'}
Aroma Notes: ${aroma || 'Not provided'}
Flavor Notes: ${flavor || 'Not provided'}

Please write comprehensive, engaging tasting notes that could be used on a brewery website, menu board, and Untappd. Include sections for Appearance, Aroma, Flavor, Mouthfeel, and Overall Impression. Also include a short 1-2 sentence description suitable for a tap list.`;

    const content = await callOpenRouter(systemPrompt, userPrompt);

    res.json({
      success: true,
      data: {
        title: `Tasting Notes: ${beer_name || style || 'Beer'}`,
        content,
        suggestions: [
          'Use the short description for tap lists and menus',
          'Full notes work well for website and social media',
          'Consider pairing suggestions to complement these notes',
        ],
        metadata: { beer_name, style, abv },
      },
    });
  } catch (err) {
    console.error('AI tasting notes error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/food-pairing
router.post('/food-pairing', async (req, res) => {
  try {
    const { beer_name, style, flavor_profile } = req.body;

    const systemPrompt = `You are a culinary expert and certified Cicerone who specializes in beer and food pairing. You understand the principles of complementary and contrasting flavors, how carbonation and bitterness interact with food, and how different beer styles pair with various cuisines. Your recommendations should include specific dishes, cooking methods, and ingredients that enhance both the beer and food experience. Consider intensity matching, flavor bridging, and textural contrast in your pairings. Provide pairings suitable for a brewery taproom menu.`;

    const userPrompt = `Suggest food pairings for the following beer:
Beer Name: ${beer_name || 'Not specified'}
Style: ${style || 'Not specified'}
Flavor Profile: ${flavor_profile || 'Classic for the style'}

Please provide:
1. Top 5 specific dish recommendations with explanations of why they pair well
2. Cheese pairings (3 recommendations)
3. Snack/appetizer pairings for a taproom setting
4. A suggested tasting flight progression if this beer is part of a multi-course pairing
5. Foods to avoid with this beer and why`;

    const content = await callOpenRouter(systemPrompt, userPrompt);

    res.json({
      success: true,
      data: {
        title: `Food Pairings: ${beer_name || style || 'Beer'}`,
        content,
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
});

// POST /api/ai/demand-forecast
router.post('/demand-forecast', async (req, res) => {
  try {
    const { beer_name, historical_sales, season, events } = req.body;

    const systemPrompt = `You are a brewery operations analyst and demand planning expert with deep experience in craft beverage forecasting. You understand seasonal trends in craft beer sales, the impact of local events and holidays, taproom vs distribution channel dynamics, and inventory management for perishable products. Provide data-driven forecasting recommendations with specific production volume suggestions, timing recommendations, and risk factors. Consider shelf life, tank capacity utilization, and cash flow implications in your analysis.`;

    const userPrompt = `Provide a demand forecast and production planning recommendation for:
Beer Name: ${beer_name || 'Not specified'}
Historical Sales Data: ${historical_sales ? JSON.stringify(historical_sales) : 'Not provided'}
Current Season: ${season || 'Not specified'}
Upcoming Events: ${events ? JSON.stringify(events) : 'None specified'}

Please provide:
1. Demand forecast for the next 4 weeks with weekly breakdowns
2. Recommended production volume (in BBL)
3. Optimal brew timing to meet forecasted demand
4. Risk factors that could affect demand (weather, competition, trends)
5. Inventory management recommendations (min/max stock levels)
6. Channel allocation suggestions (taproom vs distribution vs events)`;

    const content = await callOpenRouter(systemPrompt, userPrompt);

    res.json({
      success: true,
      data: {
        title: `Demand Forecast: ${beer_name || 'Production Planning'}`,
        content,
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
});

// POST /api/ai/quality-analysis
router.post('/quality-analysis', async (req, res) => {
  try {
    const { batch_id, parameters, deviations } = req.body;

    const systemPrompt = `You are a brewery quality assurance manager and fermentation scientist with expertise in troubleshooting brewing process deviations. You have deep knowledge of off-flavor identification (using the Beer Flavor Wheel), microbiology, water chemistry, and brewing process control. When analyzing quality issues, you perform systematic root cause analysis, consider multiple potential causes, and provide actionable corrective and preventive actions (CAPA). Your recommendations follow food safety best practices and brewing industry quality standards.`;

    const userPrompt = `Perform a quality analysis for the following batch:
Batch ID: ${batch_id || 'Not specified'}
Measured Parameters: ${parameters ? JSON.stringify(parameters) : 'Not provided'}
Observed Deviations: ${deviations ? JSON.stringify(deviations) : 'Not specified'}

Please provide:
1. Root cause analysis for each deviation observed
2. Severity assessment (critical, major, minor) for each issue
3. Immediate corrective actions to salvage the current batch (if possible)
4. Preventive actions to avoid recurrence
5. Recommended additional lab tests to run
6. Decision recommendation: release, hold, blend, or dump
7. Process improvement suggestions`;

    const content = await callOpenRouter(systemPrompt, userPrompt);

    res.json({
      success: true,
      data: {
        title: `Quality Analysis: Batch ${batch_id || 'Unknown'}`,
        content,
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
});

// POST /api/ai/label-copy
router.post('/label-copy', async (req, res) => {
  try {
    const { beer_name, style, abv, description, brewery_name } = req.body;

    const systemPrompt = `You are a craft beverage marketing copywriter who specializes in beer label copy, can descriptions, and packaging text. You understand TTB labeling requirements, craft beer consumer psychology, and brand storytelling. Your copy is engaging, on-brand, and compliant with alcohol beverage labeling regulations. You write in various tones from playful and irreverent to sophisticated and traditional, matching the brewery's brand voice. You also consider the limited space on labels and create copy that is concise yet impactful.`;

    const userPrompt = `Write label copy for the following beer:
Beer Name: ${beer_name || 'Not specified'}
Style: ${style || 'Not specified'}
ABV: ${abv || 'Not specified'}
Description/Story: ${description || 'Not provided'}
Brewery Name: ${brewery_name || 'Not specified'}

Please provide:
1. Primary label copy (front label - 15-25 words max)
2. Extended description (back label or can side - 50-75 words)
3. Tagline (5-8 words)
4. Social media caption (for Instagram/Facebook release announcement)
5. Untappd description (2-3 sentences)
6. TTB-compliant government warning reminder text placement note
7. Three alternative tagline options`;

    const content = await callOpenRouter(systemPrompt, userPrompt);

    res.json({
      success: true,
      data: {
        title: `Label Copy: ${beer_name || 'Beer'}`,
        content,
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
});

// POST /api/ai/event-content
router.post('/event-content', async (req, res) => {
  try {
    const { event_type, event_name, date, details } = req.body;

    const systemPrompt = `You are a brewery events and marketing coordinator with expertise in creating compelling event descriptions, social media content, and promotional materials for craft brewery events. You understand the craft beer community, taproom culture, and what drives attendance at brewery events. Your content is engaging, informative, and creates a sense of excitement and urgency. You write for multiple platforms including social media, email newsletters, website listings, and print materials.`;

    const userPrompt = `Create marketing content for the following brewery event:
Event Type: ${event_type || 'Not specified'}
Event Name: ${event_name || 'Not specified'}
Date: ${date || 'TBD'}
Details: ${details ? JSON.stringify(details) : 'Not provided'}

Please provide:
1. Event description for website (150-200 words)
2. Facebook event description (100-150 words)
3. Instagram caption with relevant hashtags
4. Email newsletter blurb (75-100 words)
5. SMS/text notification (160 characters max)
6. Press release paragraph (if newsworthy)
7. Day-of social media post
8. Suggested promotional timeline (when to post what)`;

    const content = await callOpenRouter(systemPrompt, userPrompt);

    res.json({
      success: true,
      data: {
        title: `Event Content: ${event_name || event_type || 'Event'}`,
        content,
        suggestions: [
          'Schedule posts according to the suggested timeline',
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
});

module.exports = router;
