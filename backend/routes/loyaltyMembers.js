const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM loyalty_members ORDER BY name');
    res.json(result.rows);
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

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, tier, points, join_date, visits, total_spent, birthday, favorite_beer, status, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO loyalty_members (name, email, phone, tier, points, join_date, visits, total_spent, birthday, favorite_beer, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, email, phone, tier || 'bronze', points || 0, join_date || null, visits || 0, total_spent || 0, birthday || null, favorite_beer, status || 'active', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
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
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM loyalty_members WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
