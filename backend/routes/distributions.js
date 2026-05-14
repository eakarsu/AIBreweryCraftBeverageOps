const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM distributions');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM distributions ORDER BY order_date DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM distributions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/',
  [
    body('distributor').notEmpty().isLength({ max: 200 }).withMessage('distributor required'),
    body('quantity').optional().isFloat({ min: 0 }),
    body('unit_price').optional().isFloat({ min: 0 }),
    body('total').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { distributor, order_date, delivery_date, product, quantity, unit_price, total, region, status, tracking_number, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO distributions (distributor, order_date, delivery_date, product, quantity, unit_price, total, region, status, tracking_number, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [distributor, order_date || null, delivery_date || null, product, quantity, unit_price, total, region, status || 'pending', tracking_number, notes]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.put('/:id',
  [
    body('distributor').optional().isLength({ max: 200 }),
    body('quantity').optional().isFloat({ min: 0 }),
    body('unit_price').optional().isFloat({ min: 0 }),
    body('total').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { distributor, order_date, delivery_date, product, quantity, unit_price, total, region, status, tracking_number, notes } = req.body;
      const result = await pool.query(
        `UPDATE distributions SET distributor=$1, order_date=$2, delivery_date=$3, product=$4, quantity=$5, unit_price=$6, total=$7, region=$8, status=$9, tracking_number=$10, notes=$11
         WHERE id=$12 RETURNING *`,
        [distributor, order_date || null, delivery_date || null, product, quantity, unit_price, total, region, status, tracking_number, notes, req.params.id]
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
    const result = await pool.query('DELETE FROM distributions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
