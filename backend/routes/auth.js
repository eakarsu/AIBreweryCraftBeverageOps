const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { body, validationResult } = require('express-validator');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable not set');
  return secret;
}

// Ensure users table exists
async function ensureUsersTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(200) UNIQUE NOT NULL,
      password VARCHAR(200) NOT NULL,
      role VARCHAR(50) DEFAULT 'staff',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').optional().isString().isLength({ max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    try {
      await ensureUsersTable();
      const { email, password, name } = req.body;
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      const hashed = await bcrypt.hash(password, 12);
      const result = await pool.query(
        "INSERT INTO users (email, password, name, role, tenant_id) VALUES ($1, $2, $3, 'operator', 'pending') RETURNING id, email, name, role, tenant_id",
        [email, hashed, name || null]
      );
      const user = result.rows[0];
      user.tenant_id = `user:${user.id}`;
      await pool.query('UPDATE users SET tenant_id=$1 WHERE id=$2', [user.tenant_id, user.id]);
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id }, getJwtSecret(), { expiresIn: '24h' });
      res.status(201).json({ success: true, token, user });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
    try {
      await ensureUsersTable();
      const { email, password } = req.body;

      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id },
        getJwtSecret(),
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
