const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cip_schedules ORDER BY scheduled_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cip_schedules WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { equipment, scheduled_date, completed_date, cip_type, chemical_concentration, temperature, duration_minutes, operator, status, verification, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO cip_schedules (equipment, scheduled_date, completed_date, cip_type, chemical_concentration, temperature, duration_minutes, operator, status, verification, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [equipment, scheduled_date || null, completed_date || null, cip_type, chemical_concentration, temperature, duration_minutes, operator, status || 'scheduled', verification, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { equipment, scheduled_date, completed_date, cip_type, chemical_concentration, temperature, duration_minutes, operator, status, verification, notes } = req.body;
    const result = await pool.query(
      `UPDATE cip_schedules SET equipment=$1, scheduled_date=$2, completed_date=$3, cip_type=$4, chemical_concentration=$5, temperature=$6, duration_minutes=$7, operator=$8, status=$9, verification=$10, notes=$11
       WHERE id=$12 RETURNING *`,
      [equipment, scheduled_date || null, completed_date || null, cip_type, chemical_concentration, temperature, duration_minutes, operator, status, verification, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM cip_schedules WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
