const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_CIP_TYPES = ['caustic', 'acid', 'sanitizer', 'full_cycle', 'rinse_only'];
const VALID_STATUSES = ['scheduled', 'in_progress', 'completed', 'overdue'];
const VALID_VERIFICATIONS = ['pass', 'fail', 'pending'];

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM cip_schedules');
    const total = parseInt(cnt.rows[0].count);
    const r = await pool.query('SELECT * FROM cip_schedules ORDER BY scheduled_date DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cip_schedules WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/',
  [
    body('equipment').notEmpty().isLength({ max: 200 }).withMessage('equipment required'),
    body('cip_type').optional().isIn(VALID_CIP_TYPES).withMessage(`cip_type must be one of: ${VALID_CIP_TYPES.join(', ')}`),
    body('chemical_concentration').optional().isFloat({ min: 0, max: 100 }).withMessage('chemical_concentration must be 0-100%'),
    body('temperature').optional().isFloat({ min: 0, max: 250 }),
    body('duration_minutes').optional().isInt({ min: 1 }),
    body('status').optional().isIn(VALID_STATUSES),
    body('verification').optional().isIn(VALID_VERIFICATIONS),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { equipment, scheduled_date, completed_date, cip_type, chemical_concentration, temperature, duration_minutes, operator, status, verification, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO cip_schedules (equipment, scheduled_date, completed_date, cip_type, chemical_concentration, temperature, duration_minutes, operator, status, verification, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [equipment, scheduled_date || null, completed_date || null, cip_type, chemical_concentration, temperature, duration_minutes, operator, status || 'scheduled', verification, notes]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.put('/:id',
  [
    body('equipment').optional().isLength({ max: 200 }),
    body('cip_type').optional().isIn(VALID_CIP_TYPES),
    body('chemical_concentration').optional().isFloat({ min: 0, max: 100 }),
    body('temperature').optional().isFloat({ min: 0, max: 250 }),
    body('duration_minutes').optional().isInt({ min: 1 }),
    body('status').optional().isIn(VALID_STATUSES),
    body('verification').optional().isIn(VALID_VERIFICATIONS),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { equipment, scheduled_date, completed_date, cip_type, chemical_concentration, temperature, duration_minutes, operator, status, verification, notes } = req.body;
      const result = await pool.query(
        `UPDATE cip_schedules SET equipment=$1, scheduled_date=$2, completed_date=$3, cip_type=$4, chemical_concentration=$5, temperature=$6, duration_minutes=$7, operator=$8, status=$9, verification=$10, notes=$11
         WHERE id=$12 RETURNING *`,
        [equipment, scheduled_date || null, completed_date || null, cip_type, chemical_concentration, temperature, duration_minutes, operator, status, verification, notes, req.params.id]
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
    const result = await pool.query('DELETE FROM cip_schedules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
