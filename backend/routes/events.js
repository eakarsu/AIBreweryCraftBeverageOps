const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_TYPES = ['tasting', 'release', 'private', 'fundraiser', 'music', 'food_truck', 'trivia', 'other'];
const VALID_STATUSES = ['scheduled', 'active', 'completed', 'cancelled'];

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM events');
    const total = parseInt(cnt.rows[0].count);
    const r = await pool.query('SELECT * FROM events ORDER BY date DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
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
    body('capacity').optional().isInt({ min: 1 }).withMessage('capacity must be a positive integer'),
    body('tickets_sold').optional().isInt({ min: 0 }),
    body('ticket_price').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, type, date, start_time, end_time, capacity, tickets_sold, ticket_price, description, status, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO events (name, type, date, start_time, end_time, capacity, tickets_sold, ticket_price, description, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [name, type, date || null, start_time, end_time, capacity, tickets_sold || 0, ticket_price, description, status || 'scheduled', notes]
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
    body('capacity').optional().isInt({ min: 1 }),
    body('tickets_sold').optional().isInt({ min: 0 }),
    body('ticket_price').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, type, date, start_time, end_time, capacity, tickets_sold, ticket_price, description, status, notes } = req.body;
      const result = await pool.query(
        `UPDATE events SET name=$1, type=$2, date=$3, start_time=$4, end_time=$5, capacity=$6, tickets_sold=$7, ticket_price=$8, description=$9, status=$10, notes=$11
         WHERE id=$12 RETURNING *`,
        [name, type, date || null, start_time, end_time, capacity, tickets_sold, ticket_price, description, status, notes, req.params.id]
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
    const result = await pool.query('DELETE FROM events WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
