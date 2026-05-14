const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_SIZES = ['half_barrel', 'quarter_barrel', 'sixth_barrel', 'slim_quarter'];
const VALID_STATUSES = ['full', 'tapped', 'empty', 'cleaning', 'lost', 'damaged'];

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM kegs');
    const total = parseInt(cnt.rows[0].count);
    const r = await pool.query('SELECT * FROM kegs ORDER BY keg_id LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM kegs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/',
  [
    body('keg_id').notEmpty().isLength({ max: 100 }).withMessage('keg_id required'),
    body('beer_name').optional().isLength({ max: 200 }),
    body('size').optional().isIn(VALID_SIZES).withMessage(`size must be one of: ${VALID_SIZES.join(', ')}`),
    body('status').optional().isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { keg_id, beer_name, batch_id, size, fill_date, status, location, distributor, notes } = req.body;
      const result = await pool.query(
        `INSERT INTO kegs (keg_id, beer_name, batch_id, size, fill_date, status, location, distributor, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [keg_id, beer_name, batch_id, size, fill_date || null, status || 'empty', location, distributor, notes]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.put('/:id',
  [
    body('keg_id').optional().isLength({ max: 100 }),
    body('beer_name').optional().isLength({ max: 200 }),
    body('size').optional().isIn(VALID_SIZES),
    body('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { keg_id, beer_name, batch_id, size, fill_date, status, location, distributor, notes } = req.body;
      const result = await pool.query(
        `UPDATE kegs SET keg_id=$1, beer_name=$2, batch_id=$3, size=$4, fill_date=$5, status=$6, location=$7, distributor=$8, notes=$9
         WHERE id=$10 RETURNING *`,
        [keg_id, beer_name, batch_id, size, fill_date || null, status, location, distributor, notes, req.params.id]
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
    const result = await pool.query('DELETE FROM kegs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
