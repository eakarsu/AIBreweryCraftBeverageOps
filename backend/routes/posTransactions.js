const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_PAYMENT_METHODS = ['cash', 'credit', 'debit', 'tab', 'gift_card'];

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM pos_transactions');
    const total = parseInt(cnt.rows[0].count);
    const r = await pool.query('SELECT * FROM pos_transactions ORDER BY date DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pos_transactions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/',
  [
    body('total').notEmpty().isFloat({ min: 0 }).withMessage('total is required and must be non-negative'),
    body('subtotal').optional().isFloat({ min: 0 }),
    body('tax').optional().isFloat({ min: 0 }),
    body('tip').optional().isFloat({ min: 0 }),
    body('payment_method').optional().isIn(VALID_PAYMENT_METHODS).withMessage(`payment_method must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`),
    body('customer_name').optional().isString().isLength({ max: 200 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { transaction_id, date, time, items, subtotal, tax, tip, total, payment_method, server, customer_name, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO pos_transactions (transaction_id, date, time, items, subtotal, tax, tip, total, payment_method, server, customer_name, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [transaction_id, date || null, time, items ? JSON.stringify(items) : null, subtotal, tax, tip, total, payment_method, server, customer_name, notes]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.put('/:id',
  [
    body('total').optional().isFloat({ min: 0 }),
    body('subtotal').optional().isFloat({ min: 0 }),
    body('tax').optional().isFloat({ min: 0 }),
    body('tip').optional().isFloat({ min: 0 }),
    body('payment_method').optional().isIn(VALID_PAYMENT_METHODS),
    body('customer_name').optional().isString().isLength({ max: 200 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { transaction_id, date, time, items, subtotal, tax, tip, total, payment_method, server, customer_name, notes } = req.body;
      const result = await pool.query(
        `UPDATE pos_transactions SET transaction_id=$1, date=$2, time=$3, items=$4, subtotal=$5, tax=$6, tip=$7, total=$8, payment_method=$9, server=$10, customer_name=$11, notes=$12
         WHERE id=$13 RETURNING *`,
        [transaction_id, date || null, time, items ? JSON.stringify(items) : null, subtotal, tax, tip, total, payment_method, server, customer_name, notes, req.params.id]
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
    const result = await pool.query('DELETE FROM pos_transactions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
