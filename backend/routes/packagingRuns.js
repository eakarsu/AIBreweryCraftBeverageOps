const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM packaging_runs ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM packaging_runs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { batch_id, package_type, quantity, date, line, operator, fill_level, co2_volumes, do_level, status, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO packaging_runs (batch_id, package_type, quantity, date, line, operator, fill_level, co2_volumes, do_level, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [batch_id, package_type, quantity, date || null, line, operator, fill_level, co2_volumes, do_level, status || 'scheduled', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { batch_id, package_type, quantity, date, line, operator, fill_level, co2_volumes, do_level, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE packaging_runs SET batch_id=$1, package_type=$2, quantity=$3, date=$4, line=$5, operator=$6, fill_level=$7, co2_volumes=$8, do_level=$9, status=$10, notes=$11
       WHERE id=$12 RETURNING *`,
      [batch_id, package_type, quantity, date || null, line, operator, fill_level, co2_volumes, do_level, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM packaging_runs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
