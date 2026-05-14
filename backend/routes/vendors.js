const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_CATEGORIES = ['grain', 'hops', 'yeast', 'packaging', 'chemicals', 'equipment', 'services', 'other'];
const VALID_PAYMENT_TERMS = ['net_15', 'net_30', 'net_60', 'cod', 'prepaid'];
const VALID_STATUSES = ['active', 'inactive', 'pending', 'blacklisted'];

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM vendors');
    const total = parseInt(cnt.rows[0].count);
    const r = await pool.query('SELECT * FROM vendors ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vendors WHERE id = $1', [req.params.id]);
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
    body('email').optional().isEmail().normalizeEmail(),
    body('payment_terms').optional().isIn(VALID_PAYMENT_TERMS),
    body('lead_time_days').optional().isInt({ min: 0 }),
    body('rating').optional().isFloat({ min: 1, max: 5 }).withMessage('rating must be 1-5'),
    body('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, category, contact_name, email, phone, address, website, payment_terms, lead_time_days, rating, status, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO vendors (name, category, contact_name, email, phone, address, website, payment_terms, lead_time_days, rating, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [name, category, contact_name, email, phone, address, website, payment_terms, lead_time_days, rating, status || 'active', notes]
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
    body('email').optional().isEmail().normalizeEmail(),
    body('payment_terms').optional().isIn(VALID_PAYMENT_TERMS),
    body('lead_time_days').optional().isInt({ min: 0 }),
    body('rating').optional().isFloat({ min: 1, max: 5 }),
    body('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, category, contact_name, email, phone, address, website, payment_terms, lead_time_days, rating, status, notes } = req.body;
      const result = await pool.query(
        `UPDATE vendors SET name=$1, category=$2, contact_name=$3, email=$4, phone=$5, address=$6, website=$7, payment_terms=$8, lead_time_days=$9, rating=$10, status=$11, notes=$12
         WHERE id=$13 RETURNING *`,
        [name, category, contact_name, email, phone, address, website, payment_terms, lead_time_days, rating, status, notes, req.params.id]
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
    const result = await pool.query('DELETE FROM vendors WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
