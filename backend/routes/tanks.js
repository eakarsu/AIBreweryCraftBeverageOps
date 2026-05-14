const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_TYPES = ['fermenter', 'brite', 'hot_liquor', 'cold_liquor', 'mash_tun', 'kettle'];
const VALID_STATUSES = ['available', 'in_use', 'cleaning', 'maintenance'];

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM tanks');
    const total = parseInt(cnt.rows[0].count);
    const r = await pool.query('SELECT * FROM tanks ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tanks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/',
  [
    body('name').notEmpty().isLength({ max: 100 }).withMessage('name required, max 100 chars'),
    body('type').optional().isIn(VALID_TYPES).withMessage(`type must be one of: ${VALID_TYPES.join(', ')}`),
    body('capacity_gallons').optional().isFloat({ min: 0 }).withMessage('capacity_gallons must be non-negative'),
    body('status').optional().isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    body('temperature').optional().isFloat(),
    body('pressure_psi').optional().isFloat({ min: 0 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, type, capacity_gallons, status, current_batch, temperature, pressure_psi, location, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO tanks (name, type, capacity_gallons, status, current_batch, temperature, pressure_psi, location, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [name, type, capacity_gallons, status || 'available', current_batch, temperature, pressure_psi, location, notes]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.put('/:id',
  [
    body('name').optional().isLength({ max: 100 }),
    body('type').optional().isIn(VALID_TYPES),
    body('capacity_gallons').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(VALID_STATUSES),
    body('temperature').optional().isFloat(),
    body('pressure_psi').optional().isFloat({ min: 0 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, type, capacity_gallons, status, current_batch, temperature, pressure_psi, location, notes } = req.body;
      const result = await pool.query(
        `UPDATE tanks SET name=$1, type=$2, capacity_gallons=$3, status=$4, current_batch=$5, temperature=$6, pressure_psi=$7, location=$8, notes=$9
         WHERE id=$10 RETURNING *`,
        [name, type, capacity_gallons, status, current_batch, temperature, pressure_psi, location, notes, req.params.id]
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
    const result = await pool.query('DELETE FROM tanks WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
