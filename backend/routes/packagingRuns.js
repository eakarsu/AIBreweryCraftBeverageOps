const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_PKG_TYPES = ['can_12oz', 'can_16oz', 'bottle_12oz', 'bottle_22oz', 'keg_half', 'keg_sixth', 'crowler'];
const VALID_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM packaging_runs');
    const total = parseInt(cnt.rows[0].count);
    const r = await pool.query('SELECT * FROM packaging_runs ORDER BY date DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM packaging_runs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/',
  [
    body('batch_id').notEmpty().withMessage('batch_id required'),
    body('package_type').optional().isIn(VALID_PKG_TYPES).withMessage(`package_type must be one of: ${VALID_PKG_TYPES.join(', ')}`),
    body('quantity').optional().isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
    body('fill_level').optional().isFloat({ min: 0 }),
    body('co2_volumes').optional().isFloat({ min: 0 }),
    body('do_level').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { batch_id, package_type, quantity, date, line, operator, fill_level, co2_volumes, do_level, status, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO packaging_runs (batch_id, package_type, quantity, date, line, operator, fill_level, co2_volumes, do_level, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [batch_id, package_type, quantity, date || null, line, operator, fill_level, co2_volumes, do_level, status || 'scheduled', notes]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.put('/:id',
  [
    body('package_type').optional().isIn(VALID_PKG_TYPES),
    body('quantity').optional().isInt({ min: 1 }),
    body('fill_level').optional().isFloat({ min: 0 }),
    body('co2_volumes').optional().isFloat({ min: 0 }),
    body('do_level').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { batch_id, package_type, quantity, date, line, operator, fill_level, co2_volumes, do_level, status, notes } = req.body;
      const result = await pool.query(
        `UPDATE packaging_runs SET batch_id=$1, package_type=$2, quantity=$3, date=$4, line=$5, operator=$6, fill_level=$7, co2_volumes=$8, do_level=$9, status=$10, notes=$11
         WHERE id=$12 RETURNING *`,
        [batch_id, package_type, quantity, date || null, line, operator, fill_level, co2_volumes, do_level, status, notes, req.params.id]
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
    const result = await pool.query('DELETE FROM packaging_runs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
