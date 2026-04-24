const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM raw_materials ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM raw_materials WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, category, quantity, unit, supplier, lot_number, cost_per_unit, reorder_point, expiration_date, status, storage_location, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO raw_materials (name, category, quantity, unit, supplier, lot_number, cost_per_unit, reorder_point, expiration_date, status, storage_location, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [name, category, quantity, unit, supplier, lot_number, cost_per_unit, reorder_point, expiration_date || null, status || 'in_stock', storage_location, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, category, quantity, unit, supplier, lot_number, cost_per_unit, reorder_point, expiration_date, status, storage_location, notes } = req.body;
    const result = await pool.query(
      `UPDATE raw_materials SET name=$1, category=$2, quantity=$3, unit=$4, supplier=$5, lot_number=$6, cost_per_unit=$7, reorder_point=$8, expiration_date=$9, status=$10, storage_location=$11, notes=$12
       WHERE id=$13 RETURNING *`,
      [name, category, quantity, unit, supplier, lot_number, cost_per_unit, reorder_point, expiration_date || null, status, storage_location, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM raw_materials WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
