const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_STATUSES = ['planning', 'brewing', 'fermenting', 'conditioning', 'completed'];

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM brew_logs');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM brew_logs ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Error fetching brew logs:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM brew_logs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/',
  [
    body('recipe_name').notEmpty().isLength({ max: 200 }).withMessage('recipe_name required, max 200 chars'),
    body('style').optional().isString().isLength({ max: 100 }),
    body('abv').optional().isFloat({ min: 0, max: 25 }).withMessage('abv must be 0-25'),
    body('og').optional().isFloat({ min: 0.9, max: 1.2 }).withMessage('og must be 0.9-1.2'),
    body('fg').optional().isFloat({ min: 0.9, max: 1.1 }).withMessage('fg must be 0.9-1.1'),
    body('ibu').optional().isInt({ min: 0, max: 500 }).withMessage('ibu must be 0-500'),
    body('mash_temp').optional().isFloat({ min: 100, max: 200 }).withMessage('mash_temp must be 100-200F'),
    body('volume_gallons').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { batch_id, recipe_name, style, brew_date, brewer, grain_bill, hops, yeast, mash_temp, og, fg, abv, ibu, volume_gallons, status, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO brew_logs (batch_id, recipe_name, style, brew_date, brewer, grain_bill, hops, yeast, mash_temp, og, fg, abv, ibu, volume_gallons, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [batch_id, recipe_name, style, brew_date || null, brewer, grain_bill, hops, yeast, mash_temp, og, fg, abv, ibu, volume_gallons, status || 'planning', notes]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creating brew log:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.put('/:id',
  [
    body('recipe_name').optional().isLength({ max: 200 }),
    body('style').optional().isString().isLength({ max: 100 }),
    body('abv').optional().isFloat({ min: 0, max: 25 }),
    body('og').optional().isFloat({ min: 0.9, max: 1.2 }),
    body('fg').optional().isFloat({ min: 0.9, max: 1.1 }),
    body('ibu').optional().isInt({ min: 0, max: 500 }),
    body('mash_temp').optional().isFloat({ min: 100, max: 200 }),
    body('volume_gallons').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { batch_id, recipe_name, style, brew_date, brewer, grain_bill, hops, yeast, mash_temp, og, fg, abv, ibu, volume_gallons, status, notes } = req.body;
      const result = await pool.query(
        `UPDATE brew_logs SET batch_id=$1, recipe_name=$2, style=$3, brew_date=$4, brewer=$5, grain_bill=$6, hops=$7, yeast=$8, mash_temp=$9, og=$10, fg=$11, abv=$12, ibu=$13, volume_gallons=$14, status=$15, notes=$16
         WHERE id=$17 RETURNING *`,
        [batch_id, recipe_name, style, brew_date || null, brewer, grain_bill, hops, yeast, mash_temp, og, fg, abv, ibu, volume_gallons, status, notes, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM brew_logs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
