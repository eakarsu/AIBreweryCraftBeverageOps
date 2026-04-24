const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY date DESC');
    res.json(result.rows);
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

router.post('/', async (req, res) => {
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
});

router.put('/:id', async (req, res) => {
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
});

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
