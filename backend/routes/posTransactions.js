const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pos_transactions ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pos_transactions WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { transaction_id, date, time, items, subtotal, tax, tip, total, payment_method, server, customer_name, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO pos_transactions (transaction_id, date, time, items, subtotal, tax, tip, total, payment_method, server, customer_name, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [transaction_id, date || null, time, items ? JSON.stringify(items) : null, subtotal, tax, tip, total, payment_method, server, customer_name, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { transaction_id, date, time, items, subtotal, tax, tip, total, payment_method, server, customer_name, notes } = req.body;
    const result = await pool.query(
      `UPDATE pos_transactions SET transaction_id=$1, date=$2, time=$3, items=$4, subtotal=$5, tax=$6, tip=$7, total=$8, payment_method=$9, server=$10, customer_name=$11, notes=$12
       WHERE id=$13 RETURNING *`,
      [transaction_id, date || null, time, items ? JSON.stringify(items) : null, subtotal, tax, tip, total, payment_method, server, customer_name, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM pos_transactions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
