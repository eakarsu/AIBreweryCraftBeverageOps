const router = require('express').Router();
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
}

const VALID_TIERS = ['bronze', 'silver', 'gold', 'platinum'];
const VALID_STATUSES = ['active', 'inactive', 'suspended'];

// Tier upgrade thresholds (points)
const TIER_THRESHOLDS = { silver: 500, gold: 1500, platinum: 3000 };

function calculateTier(points) {
  if (points >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (points >= TIER_THRESHOLDS.gold) return 'gold';
  if (points >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const cnt = await pool.query('SELECT COUNT(*) FROM loyalty_members');
    const total = parseInt(cnt.rows[0].count);
    const r = await pool.query('SELECT * FROM loyalty_members ORDER BY name LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({ data: r.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM loyalty_members WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/',
  [
    body('name').notEmpty().isLength({ max: 200 }).withMessage('name required, max 200 chars'),
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().isString().isLength({ max: 50 }),
    body('tier').optional().isIn(VALID_TIERS),
    body('points').optional().isInt({ min: 0 }),
    body('visits').optional().isInt({ min: 0 }),
    body('total_spent').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, email, phone, tier, points, join_date, visits, total_spent, birthday, favorite_beer, status, notes } = req.body;
      const pointsVal = points || 0;
      const effectiveTier = tier || calculateTier(pointsVal);
      const result = await pool.query(
        `INSERT INTO loyalty_members (name, email, phone, tier, points, join_date, visits, total_spent, birthday, favorite_beer, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [name, email, phone, effectiveTier, pointsVal, join_date || null, visits || 0, total_spent || 0, birthday || null, favorite_beer, status || 'active', notes]
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
    body('email').optional().isEmail().normalizeEmail(),
    body('phone').optional().isString().isLength({ max: 50 }),
    body('tier').optional().isIn(VALID_TIERS),
    body('points').optional().isInt({ min: 0 }),
    body('visits').optional().isInt({ min: 0 }),
    body('total_spent').optional().isFloat({ min: 0 }),
    body('status').optional().isIn(VALID_STATUSES),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { name, email, phone, tier, points, join_date, visits, total_spent, birthday, favorite_beer, status, notes } = req.body;
      const result = await pool.query(
        `UPDATE loyalty_members SET name=$1, email=$2, phone=$3, tier=$4, points=$5, join_date=$6, visits=$7, total_spent=$8, birthday=$9, favorite_beer=$10, status=$11, notes=$12
         WHERE id=$13 RETURNING *`,
        [name, email, phone, tier, points, join_date || null, visits, total_spent, birthday || null, favorite_beer, status, notes, req.params.id]
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
    const result = await pool.query('DELETE FROM loyalty_members WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /:id/award-points — award points and auto-upgrade tier
router.post('/:id/award-points',
  [
    body('points').isInt({ min: 1 }).withMessage('points must be a positive integer'),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { points, reason } = req.body;
      const existing = await pool.query('SELECT * FROM loyalty_members WHERE id = $1', [req.params.id]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Member not found' });

      const member = existing.rows[0];
      const newPoints = (parseInt(member.points) || 0) + parseInt(points);
      const newTier = calculateTier(newPoints);
      const tierUpgraded = newTier !== member.tier;

      const result = await pool.query(
        'UPDATE loyalty_members SET points = $1, tier = $2 WHERE id = $3 RETURNING *',
        [newPoints, newTier, req.params.id]
      );

      res.json({
        success: true,
        member: result.rows[0],
        points_awarded: parseInt(points),
        new_total_points: newPoints,
        tier_upgraded: tierUpgraded,
        new_tier: newTier,
        reason: reason || null,
      });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /:id/redeem-points — redeem points
router.post('/:id/redeem-points',
  [
    body('points').isInt({ min: 1 }).withMessage('points must be a positive integer'),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const { points, reason } = req.body;
      const existing = await pool.query('SELECT * FROM loyalty_members WHERE id = $1', [req.params.id]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Member not found' });

      const member = existing.rows[0];
      const currentPoints = parseInt(member.points) || 0;
      const redeemAmount = parseInt(points);

      if (redeemAmount > currentPoints) {
        return res.status(400).json({
          error: 'Insufficient points',
          available: currentPoints,
          requested: redeemAmount,
        });
      }

      const newPoints = currentPoints - redeemAmount;
      const newTier = calculateTier(newPoints);

      const result = await pool.query(
        'UPDATE loyalty_members SET points = $1, tier = $2 WHERE id = $3 RETURNING *',
        [newPoints, newTier, req.params.id]
      );

      res.json({
        success: true,
        member: result.rows[0],
        points_redeemed: redeemAmount,
        remaining_points: newPoints,
        tier: newTier,
        reason: reason || null,
      });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
