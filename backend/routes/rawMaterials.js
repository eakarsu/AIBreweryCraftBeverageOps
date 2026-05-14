const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_CATEGORIES = ['grain', 'hops', 'yeast', 'adjunct', 'chemical', 'other'];
const VALID_UNITS = ['lbs', 'oz', 'kg', 'g', 'each', 'gallons', 'liters'];
const VALID_STATUSES = ['in_stock', 'low_stock', 'out_of_stock', 'ordered'];

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM raw_materials');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM raw_materials ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/low-stock', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *, (reorder_point - quantity) AS shortage
      FROM raw_materials
      WHERE quantity IS NOT NULL AND reorder_point IS NOT NULL AND quantity <= reorder_point
      ORDER BY shortage DESC
    `);
    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM raw_materials WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/',
  [
    body('name').notEmpty().isLength({ max: 200 }).withMessage('name required, max 200 chars'),
    body('category').optional().isIn(VALID_CATEGORIES).withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),
    body('quantity').optional().isFloat({ min: 0 }).withMessage('quantity must be non-negative'),
    body('unit').optional().isIn(VALID_UNITS).withMessage(`unit must be one of: ${VALID_UNITS.join(', ')}`),
    body('cost_per_unit').optional().isFloat({ min: 0 }),
    body('reorder_point').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, category, quantity, unit, supplier, lot_number, cost_per_unit, reorder_point, expiration_date, status, storage_location, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO raw_materials (name, category, quantity, unit, supplier, lot_number, cost_per_unit, reorder_point, expiration_date, status, storage_location, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [name, category, quantity, unit, supplier, lot_number, cost_per_unit, reorder_point, expiration_date || null, status || 'in_stock', storage_location, notes]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.put('/:id',
  [
    body('name').optional().isLength({ max: 200 }),
    body('category').optional().isIn(VALID_CATEGORIES),
    body('quantity').optional().isFloat({ min: 0 }),
    body('unit').optional().isIn(VALID_UNITS),
    body('cost_per_unit').optional().isFloat({ min: 0 }),
    body('reorder_point').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, category, quantity, unit, supplier, lot_number, cost_per_unit, reorder_point, expiration_date, status, storage_location, notes } = req.body;
      const result = await pool.query(
        `UPDATE raw_materials SET name=$1, category=$2, quantity=$3, unit=$4, supplier=$5, lot_number=$6, cost_per_unit=$7, reorder_point=$8, expiration_date=$9, status=$10, storage_location=$11, notes=$12
         WHERE id=$13 RETURNING *`,
        [name, category, quantity, unit, supplier, lot_number, cost_per_unit, reorder_point, expiration_date || null, status, storage_location, notes, req.params.id]
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
    const result = await pool.query('DELETE FROM raw_materials WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
