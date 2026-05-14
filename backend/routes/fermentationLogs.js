const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM fermentation_logs');
    const total = parseInt(cnt.rows[0].count);
    const r = await pool.query('SELECT * FROM fermentation_logs ORDER BY date DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fermentation_logs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/',
  [
    body('batch_id').notEmpty().withMessage('batch_id required'),
    body('temperature').optional().isFloat({ min: 0, max: 250 }).withMessage('temperature must be 0-250F'),
    body('gravity').optional().isFloat({ min: 0.9, max: 1.2 }).withMessage('gravity must be 0.9-1.2'),
    body('ph').optional().isFloat({ min: 0, max: 14 }).withMessage('ph must be 0-14'),
    body('dissolved_oxygen').optional().isFloat({ min: 0 }),
    body('pressure_psi').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['active', 'completed', 'stalled']),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { batch_id, tank_id, date, time, temperature, gravity, ph, dissolved_oxygen, pressure_psi, status, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO fermentation_logs (batch_id, tank_id, date, time, temperature, gravity, ph, dissolved_oxygen, pressure_psi, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [batch_id, tank_id, date || null, time, temperature, gravity, ph, dissolved_oxygen, pressure_psi, status || 'active', notes]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.put('/:id',
  [
    body('temperature').optional().isFloat({ min: 0, max: 250 }),
    body('gravity').optional().isFloat({ min: 0.9, max: 1.2 }),
    body('ph').optional().isFloat({ min: 0, max: 14 }),
    body('dissolved_oxygen').optional().isFloat({ min: 0 }),
    body('pressure_psi').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(['active', 'completed', 'stalled']),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { batch_id, tank_id, date, time, temperature, gravity, ph, dissolved_oxygen, pressure_psi, status, notes } = req.body;
      const result = await pool.query(
        `UPDATE fermentation_logs SET batch_id=$1, tank_id=$2, date=$3, time=$4, temperature=$5, gravity=$6, ph=$7, dissolved_oxygen=$8, pressure_psi=$9, status=$10, notes=$11
         WHERE id=$12 RETURNING *`,
        [batch_id, tank_id, date || null, time, temperature, gravity, ph, dissolved_oxygen, pressure_psi, status, notes, req.params.id]
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
    const result = await pool.query('DELETE FROM fermentation_logs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
