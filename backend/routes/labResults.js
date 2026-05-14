const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_TEST_TYPES = ['gravity', 'ph', 'abv', 'ibu', 'color_srm', 'dissolved_oxygen', 'microbiology', 'sensory'];
const VALID_STATUSES = ['pass', 'fail', 'pending', 'retest'];

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM lab_results');
    const total = parseInt(cnt.rows[0].count);
    const r = await pool.query('SELECT * FROM lab_results ORDER BY date DESC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lab_results WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/',
  [
    body('batch_id').notEmpty().withMessage('batch_id required'),
    body('test_type').optional().isIn(VALID_TEST_TYPES).withMessage(`test_type must be one of: ${VALID_TEST_TYPES.join(', ')}`),
    body('status').optional().isIn(VALID_STATUSES).withMessage(`status must be one of: ${VALID_STATUSES.join(', ')}`),
    body('result').optional().isString().isLength({ max: 200 }),
    body('unit').optional().isString().isLength({ max: 50 }),
    body('expected_range').optional().isString().isLength({ max: 100 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { batch_id, test_type, date, result: resultVal, unit, expected_range, status, technician, equipment_used, notes } = req.body;
      const r = await pool.query(
        `INSERT INTO lab_results (batch_id, test_type, date, result, unit, expected_range, status, technician, equipment_used, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [batch_id, test_type, date || null, resultVal, unit, expected_range, status || 'pending', technician, equipment_used, notes]
      );
      res.status(201).json(r.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.put('/:id',
  [
    body('test_type').optional().isIn(VALID_TEST_TYPES),
    body('status').optional().isIn(VALID_STATUSES),
    body('result').optional().isString().isLength({ max: 200 }),
    body('unit').optional().isString().isLength({ max: 50 }),
    body('expected_range').optional().isString().isLength({ max: 100 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { batch_id, test_type, date, result: resultVal, unit, expected_range, status, technician, equipment_used, notes } = req.body;
      const r = await pool.query(
        `UPDATE lab_results SET batch_id=$1, test_type=$2, date=$3, result=$4, unit=$5, expected_range=$6, status=$7, technician=$8, equipment_used=$9, notes=$10
         WHERE id=$11 RETURNING *`,
        [batch_id, test_type, date || null, resultVal, unit, expected_range, status, technician, equipment_used, notes, req.params.id]
      );
      if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(r.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM lab_results WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
