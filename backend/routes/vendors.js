const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vendors ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vendors WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, category, contact_name, email, phone, address, website, payment_terms, lead_time_days, rating, status, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO vendors (name, category, contact_name, email, phone, address, website, payment_terms, lead_time_days, rating, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, category, contact_name, email, phone, address, website, payment_terms, lead_time_days, rating, status || 'active', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, category, contact_name, email, phone, address, website, payment_terms, lead_time_days, rating, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE vendors SET name=$1, category=$2, contact_name=$3, email=$4, phone=$5, address=$6, website=$7, payment_terms=$8, lead_time_days=$9, rating=$10, status=$11, notes=$12
       WHERE id=$13 RETURNING *`,
      [name, category, contact_name, email, phone, address, website, payment_terms, lead_time_days, rating, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM vendors WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
