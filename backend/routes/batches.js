const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');

// Valid status transitions for the batch state machine
const STATUS_TRANSITIONS = {
  planned: ['mashing'],
  mashing: ['boiling'],
  boiling: ['fermenting'],
  fermenting: ['conditioning'],
  conditioning: ['packaging'],
  packaging: ['sold'],
  sold: [],
};

const VALID_STYLES = [
  'IPA', 'Double IPA', 'Session IPA', 'West Coast IPA', 'New England IPA',
  'Pale Ale', 'American Pale Ale', 'English Pale Ale',
  'Stout', 'Imperial Stout', 'Oatmeal Stout', 'Milk Stout', 'Dry Irish Stout',
  'Porter', 'Baltic Porter', 'Robust Porter',
  'Lager', 'Pilsner', 'Czech Pilsner', 'German Pilsner', 'American Lager',
  'Wheat Beer', 'Hefeweizen', 'American Wheat', 'Witbier',
  'Sour', 'Berliner Weisse', 'Gose', 'Lambic', 'Flanders Red', 'Kettle Sour',
  'Saison', 'Belgian Strong', 'Dubbel', 'Tripel', 'Quad',
  'Barleywine', 'Amber Ale', 'Brown Ale', 'Red Ale', 'Kolsch', 'Cream Ale',
  'Blonde Ale', 'Golden Ale', 'Scottish Ale', 'Bock', 'Doppelbock',
  'Other',
];

// Ensure batches table exists
async function ensureBatchesTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS batches (
      id SERIAL PRIMARY KEY,
      batch_number VARCHAR(50) UNIQUE,
      recipe_name VARCHAR(100) NOT NULL,
      style VARCHAR(100),
      abv NUMERIC(5,2),
      og NUMERIC(6,4),
      fg NUMERIC(6,4),
      ibu INTEGER,
      batch_size_gallons NUMERIC(8,2),
      brew_date DATE,
      brewer VARCHAR(100),
      yeast_strain VARCHAR(100),
      fermentation_temp NUMERIC(5,2),
      status VARCHAR(50) DEFAULT 'planned',
      ingredients JSONB,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// GET / - list batches with pagination
router.get('/', async (req, res) => {
  try {
    await ensureBatchesTable();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM batches');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM batches ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Error fetching batches:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id - single batch
router.get('/:id', async (req, res) => {
  try {
    await ensureBatchesTable();
    const result = await pool.query('SELECT * FROM batches WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST / - create batch with validation
router.post('/',
  body('recipe_name').notEmpty().isLength({ max: 100 }).withMessage('recipe_name required, max 100 chars'),
  body('abv').optional().isFloat({ min: 0, max: 20 }).withMessage('abv must be between 0 and 20'),
  body('batch_size_gallons').optional().isFloat({ min: 0.01 }).withMessage('batch_size_gallons must be positive'),
  body('style').optional().isIn(VALID_STYLES).withMessage(`style must be one of: ${VALID_STYLES.join(', ')}`),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      await ensureBatchesTable();
      const { batch_number, recipe_name, style, abv, og, fg, ibu, batch_size_gallons, brew_date, brewer, yeast_strain, fermentation_temp, ingredients, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO batches (batch_number, recipe_name, style, abv, og, fg, ibu, batch_size_gallons, brew_date, brewer, yeast_strain, fermentation_temp, ingredients, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [batch_number, recipe_name, style, abv, og, fg, ibu, batch_size_gallons, brew_date || null, brewer, yeast_strain, fermentation_temp, ingredients ? JSON.stringify(ingredients) : null, notes]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating batch:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PUT /:id - update batch
router.put('/:id',
  body('recipe_name').optional().isLength({ max: 100 }).withMessage('recipe_name max 100 chars'),
  body('abv').optional().isFloat({ min: 0, max: 20 }).withMessage('abv must be between 0 and 20'),
  body('batch_size_gallons').optional().isFloat({ min: 0.01 }).withMessage('batch_size_gallons must be positive'),
  body('style').optional().isIn(VALID_STYLES).withMessage('invalid style'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      await ensureBatchesTable();
      const { batch_number, recipe_name, style, abv, og, fg, ibu, batch_size_gallons, brew_date, brewer, yeast_strain, fermentation_temp, ingredients, notes } = req.body;
      const result = await pool.query(
        `UPDATE batches SET batch_number=$1, recipe_name=$2, style=$3, abv=$4, og=$5, fg=$6, ibu=$7,
         batch_size_gallons=$8, brew_date=$9, brewer=$10, yeast_strain=$11, fermentation_temp=$12,
         ingredients=$13, notes=$14, updated_at=NOW() WHERE id=$15 RETURNING *`,
        [batch_number, recipe_name, style, abv, og, fg, ibu, batch_size_gallons, brew_date || null, brewer, yeast_strain, fermentation_temp, ingredients ? JSON.stringify(ingredients) : null, notes, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    await ensureBatchesTable();
    const result = await pool.query('DELETE FROM batches WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /:id/status - batch state machine transition
router.patch('/:id/status', async (req, res) => {
  try {
    await ensureBatchesTable();
    const { status: newStatus } = req.body;
    if (!newStatus) return res.status(400).json({ error: 'status is required' });

    const batchResult = await pool.query('SELECT * FROM batches WHERE id = $1', [req.params.id]);
    if (batchResult.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });

    const batch = batchResult.rows[0];
    const currentStatus = batch.status || 'planned';
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      return res.status(400).json({
        error: `Invalid transition from '${currentStatus}' to '${newStatus}'`,
        allowed: allowedTransitions,
        valid_transitions: STATUS_TRANSITIONS,
      });
    }

    // Auto-deduct inventory when moving to mashing
    const inventoryAlerts = [];
    if (newStatus === 'mashing' && batch.ingredients) {
      const ingredients = typeof batch.ingredients === 'string' ? JSON.parse(batch.ingredients) : batch.ingredients;
      if (Array.isArray(ingredients)) {
        for (const ing of ingredients) {
          const { name, quantity_needed, unit } = ing;
          if (!name || !quantity_needed) continue;

          const matResult = await pool.query(
            'SELECT * FROM raw_materials WHERE LOWER(name) = LOWER($1) LIMIT 1',
            [name]
          );

          if (matResult.rows.length === 0) {
            inventoryAlerts.push({ ingredient: name, issue: 'Not found in inventory' });
            continue;
          }

          const material = matResult.rows[0];
          const currentQty = parseFloat(material.quantity) || 0;
          const needed = parseFloat(quantity_needed) || 0;

          if (currentQty < needed) {
            inventoryAlerts.push({
              ingredient: name,
              issue: 'Insufficient quantity',
              available: currentQty,
              needed,
              unit: unit || material.unit,
            });
          } else {
            const newQty = currentQty - needed;
            await pool.query('UPDATE raw_materials SET quantity = $1 WHERE id = $2', [newQty, material.id]);
          }
        }
      }
    }

    const updated = await pool.query(
      'UPDATE batches SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newStatus, req.params.id]
    );

    const response = { success: true, batch: updated.rows[0] };
    if (inventoryAlerts.length > 0) {
      response.inventory_alerts = inventoryAlerts;
      response.warning = 'Some ingredients have insufficient inventory. Batch status updated but please review alerts.';
    }
    if (newStatus === 'mashing') {
      response.inventory_deducted = true;
    }

    res.json(response);
  } catch (err) {
    console.error('Error updating batch status:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:id/brew-sheet/pdf - generate PDF brew sheet
router.get('/:id/brew-sheet/pdf', async (req, res) => {
  try {
    await ensureBatchesTable();
    const batchResult = await pool.query('SELECT * FROM batches WHERE id = $1', [req.params.id]);
    if (batchResult.rows.length === 0) return res.status(404).json({ error: 'Batch not found' });

    const batch = batchResult.rows[0];
    const ingredients = batch.ingredients
      ? (typeof batch.ingredients === 'string' ? JSON.parse(batch.ingredients) : batch.ingredients)
      : [];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="brew-sheet-${batch.id}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('BREW SHEET', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).font('Helvetica').text(batch.recipe_name || 'Unnamed Recipe', { align: 'center' });
    doc.moveDown(1);

    // Batch Info
    doc.fontSize(14).font('Helvetica-Bold').text('Batch Information');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');

    const brewDate = batch.brew_date ? new Date(batch.brew_date).toLocaleDateString() : 'Not set';
    doc.text(`Batch Number: ${batch.batch_number || batch.id}`);
    doc.text(`Style: ${batch.style || 'Not specified'}`);
    doc.text(`Brew Date: ${brewDate}`);
    doc.text(`Brewer: ${batch.brewer || 'Not specified'}`);
    doc.text(`Batch Size: ${batch.batch_size_gallons ? batch.batch_size_gallons + ' gallons' : 'Not specified'}`);
    doc.text(`Status: ${batch.status || 'planned'}`);
    doc.moveDown(1);

    // Targets
    doc.fontSize(14).font('Helvetica-Bold').text('Target Parameters');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Target OG: ${batch.og || 'Not specified'}`);
    doc.text(`Target FG: ${batch.fg || 'Not specified'}`);
    doc.text(`Target ABV: ${batch.abv ? batch.abv + '%' : 'Not specified'}`);
    doc.text(`Target IBU: ${batch.ibu || 'Not specified'}`);
    doc.text(`Yeast Strain: ${batch.yeast_strain || 'Not specified'}`);
    doc.text(`Fermentation Temp: ${batch.fermentation_temp ? batch.fermentation_temp + '°F' : 'Not specified'}`);
    doc.moveDown(1);

    // Ingredients
    doc.fontSize(14).font('Helvetica-Bold').text('Ingredients / Recipe');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');

    if (Array.isArray(ingredients) && ingredients.length > 0) {
      ingredients.forEach((ing, i) => {
        const line = `${i + 1}. ${ing.name || 'Unknown'} - ${ing.quantity_needed || '?'} ${ing.unit || ''} ${ing.type ? '(' + ing.type + ')' : ''}`;
        doc.text(line.trim());
      });
    } else {
      doc.text('No ingredients specified. Add ingredients array to batch record.');
    }
    doc.moveDown(1);

    // Brew Steps
    doc.fontSize(14).font('Helvetica-Bold').text('Step-by-Step Brew Instructions');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');

    const steps = [
      '1. MASHING: Mill grains and add to mash tun with strike water. Maintain target mash temperature for 60 minutes.',
      '2. LAUTERING: Vorlauf until wort runs clear. Sparge to collect target pre-boil volume.',
      '3. BOILING: Bring wort to rolling boil. Add hops per schedule. Boil for 60-90 minutes.',
      '4. CHILLING: Cool wort to yeast pitch temperature using heat exchanger or ice bath.',
      '5. FERMENTING: Transfer cooled wort to fermenter. Pitch yeast. Maintain fermentation temperature. Wait for gravity to reach FG target.',
      '6. CONDITIONING: Allow beer to condition at reduced temperature for clarity and flavor development.',
      '7. PACKAGING: Transfer to serving vessel (keg/bright tank) or package into cans/bottles. Carbonate to target volumes.',
    ];

    steps.forEach(step => {
      doc.text(step);
      doc.moveDown(0.5);
    });

    doc.moveDown(1);

    // Notes
    if (batch.notes) {
      doc.fontSize(14).font('Helvetica-Bold').text('Brewer Notes');
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.3);
      doc.fontSize(11).font('Helvetica').text(batch.notes);
      doc.moveDown(1);
    }

    // Quality Checks
    doc.fontSize(14).font('Helvetica-Bold').text('Quality Checkpoints');
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.3);
    doc.fontSize(11).font('Helvetica');
    doc.text('[ ] Pre-boil gravity measured: ______');
    doc.text('[ ] OG measured: ______');
    doc.text('[ ] Fermentation started (airlock activity): ______');
    doc.text('[ ] FG measured (day 1): ______');
    doc.text('[ ] FG confirmed stable (day 2): ______');
    doc.text('[ ] Taste approved: ______');
    doc.text('[ ] Packaging date: ______');

    // Footer
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#888888').text(`Generated: ${new Date().toISOString()} | Batch ID: ${batch.id}`, { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('Error generating brew sheet PDF:', err);
    res.status(500).json({ error: 'Server error generating PDF' });
  }
});

module.exports = router;
