const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_TYPES = ['revenue', 'expense', 'cogs', 'payroll', 'tax'];
const VALID_CATEGORIES = ['taproom_sales', 'distribution', 'merchandise', 'events', 'ingredients', 'utilities', 'rent', 'labor', 'marketing', 'equipment', 'other'];
const VALID_PAYMENT_METHODS = ['cash', 'check', 'ach', 'credit_card', 'wire'];
const VALID_STATUSES = ['pending', 'completed', 'cancelled'];

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM financial_records');
    const total = parseInt(cnt.rows[0].count);
    const r = await pool.query('SELECT * FROM financial_records ORDER BY date DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM financial_records WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/',
  [
    body('type').notEmpty().isIn(VALID_TYPES).withMessage(`type must be one of: ${VALID_TYPES.join(', ')}`),
    body('amount').notEmpty().isFloat({ min: 0 }).withMessage('amount required, must be non-negative'),
    body('category').optional().isIn(VALID_CATEGORIES).withMessage(`category must be one of: ${VALID_CATEGORIES.join(', ')}`),
    body('payment_method').optional().isIn(VALID_PAYMENT_METHODS),
    body('status').optional().isIn(VALID_STATUSES),
    body('description').optional().isString().isLength({ max: 500 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { date, type, category, amount, description, reference_number, vendor, payment_method, status, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO financial_records (date, type, category, amount, description, reference_number, vendor, payment_method, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [date || null, type, category, amount, description, reference_number, vendor, payment_method, status || 'pending', notes]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.put('/:id',
  [
    body('type').optional().isIn(VALID_TYPES),
    body('amount').optional().isFloat({ min: 0 }),
    body('category').optional().isIn(VALID_CATEGORIES),
    body('payment_method').optional().isIn(VALID_PAYMENT_METHODS),
    body('status').optional().isIn(VALID_STATUSES),
    body('description').optional().isString().isLength({ max: 500 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { date, type, category, amount, description, reference_number, vendor, payment_method, status, notes } = req.body;
      const result = await pool.query(
        `UPDATE financial_records SET date=$1, type=$2, category=$3, amount=$4, description=$5, reference_number=$6, vendor=$7, payment_method=$8, status=$9, notes=$10
         WHERE id=$11 RETURNING *`,
        [date || null, type, category, amount, description, reference_number, vendor, payment_method, status, notes, req.params.id]
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
    const result = await pool.query('DELETE FROM financial_records WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
