const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tanks ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tanks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, capacity_gallons, status, current_batch, temperature, pressure_psi, location, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO tanks (name, type, capacity_gallons, status, current_batch, temperature, pressure_psi, location, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, type, capacity_gallons, status || 'available', current_batch, temperature, pressure_psi, location, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, type, capacity_gallons, status, current_batch, temperature, pressure_psi, location, notes } = req.body;
    const result = await pool.query(
      `UPDATE tanks SET name=$1, type=$2, capacity_gallons=$3, status=$4, current_batch=$5, temperature=$6, pressure_psi=$7, location=$8, notes=$9
       WHERE id=$10 RETURNING *`,
      [name, type, capacity_gallons, status, current_batch, temperature, pressure_psi, location, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tanks WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
