const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM distributions ORDER BY order_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM distributions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { distributor, order_date, delivery_date, product, quantity, unit_price, total, region, status, tracking_number, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO distributions (distributor, order_date, delivery_date, product, quantity, unit_price, total, region, status, tracking_number, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [distributor, order_date || null, delivery_date || null, product, quantity, unit_price, total, region, status || 'pending', tracking_number, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { distributor, order_date, delivery_date, product, quantity, unit_price, total, region, status, tracking_number, notes } = req.body;
    const result = await pool.query(
      `UPDATE distributions SET distributor=$1, order_date=$2, delivery_date=$3, product=$4, quantity=$5, unit_price=$6, total=$7, region=$8, status=$9, tracking_number=$10, notes=$11
       WHERE id=$12 RETURNING *`,
      [distributor, order_date || null, delivery_date || null, product, quantity, unit_price, total, region, status, tracking_number, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM distributions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
