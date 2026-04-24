const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipment ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM equipment WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, manufacturer, model, serial_number, purchase_date, last_maintenance, next_maintenance, status, location, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO equipment (name, type, manufacturer, model, serial_number, purchase_date, last_maintenance, next_maintenance, status, location, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, type, manufacturer, model, serial_number, purchase_date || null, last_maintenance || null, next_maintenance || null, status || 'active', location, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, type, manufacturer, model, serial_number, purchase_date, last_maintenance, next_maintenance, status, location, notes } = req.body;
    const result = await pool.query(
      `UPDATE equipment SET name=$1, type=$2, manufacturer=$3, model=$4, serial_number=$5, purchase_date=$6, last_maintenance=$7, next_maintenance=$8, status=$9, location=$10, notes=$11
       WHERE id=$12 RETURNING *`,
      [name, type, manufacturer, model, serial_number, purchase_date || null, last_maintenance || null, next_maintenance || null, status, location, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM equipment WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
