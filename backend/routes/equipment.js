const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_TYPES = ['brewing', 'fermentation', 'packaging', 'cooling', 'cleaning', 'lab', 'other'];
const VALID_STATUSES = ['active', 'maintenance', 'repair', 'decommissioned'];

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM equipment');
    const total = parseInt(countResult.rows[0].count);
    const result = await pool.query('SELECT * FROM equipment ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/maintenance-due', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *, (NOW()::date - next_maintenance::date) AS days_overdue
      FROM equipment
      WHERE next_maintenance IS NOT NULL AND next_maintenance::date <= NOW()::date AND status != 'decommissioned'
      ORDER BY next_maintenance ASC
    `);
    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipment WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/',
  [
    body('name').notEmpty().isLength({ max: 200 }).withMessage('name required, max 200 chars'),
    body('type').optional().isIn(VALID_TYPES).withMessage(`type must be one of: ${VALID_TYPES.join(', ')}`),
    body('status').optional().isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, type, manufacturer, model, serial_number, purchase_date, last_maintenance, next_maintenance, status, location, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO equipment (name, type, manufacturer, model, serial_number, purchase_date, last_maintenance, next_maintenance, status, location, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [name, type, manufacturer, model, serial_number, purchase_date || null, last_maintenance || null, next_maintenance || null, status || 'active', location, notes]
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
    body('type').optional().isIn(VALID_TYPES),
    body('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, type, manufacturer, model, serial_number, purchase_date, last_maintenance, next_maintenance, status, location, notes } = req.body;
      const result = await pool.query(
        `UPDATE equipment SET name=$1, type=$2, manufacturer=$3, model=$4, serial_number=$5, purchase_date=$6, last_maintenance=$7, next_maintenance=$8, status=$9, location=$10, notes=$11
         WHERE id=$12 RETURNING *`,
        [name, type, manufacturer, model, serial_number, purchase_date || null, last_maintenance || null, next_maintenance || null, status, location, notes, req.params.id]
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
    const result = await pool.query('DELETE FROM equipment WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
