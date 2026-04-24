const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fermentation_logs ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fermentation_logs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { batch_id, tank_id, date, time, temperature, gravity, ph, dissolved_oxygen, pressure_psi, status, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO fermentation_logs (batch_id, tank_id, date, time, temperature, gravity, ph, dissolved_oxygen, pressure_psi, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [batch_id, tank_id, date || null, time, temperature, gravity, ph, dissolved_oxygen, pressure_psi, status || 'active', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { batch_id, tank_id, date, time, temperature, gravity, ph, dissolved_oxygen, pressure_psi, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE fermentation_logs SET batch_id=$1, tank_id=$2, date=$3, time=$4, temperature=$5, gravity=$6, ph=$7, dissolved_oxygen=$8, pressure_psi=$9, status=$10, notes=$11
       WHERE id=$12 RETURNING *`,
      [batch_id, tank_id, date || null, time, temperature, gravity, ph, dissolved_oxygen, pressure_psi, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM fermentation_logs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
