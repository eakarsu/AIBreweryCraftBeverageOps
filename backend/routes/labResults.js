const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lab_results ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lab_results WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { batch_id, test_type, date, result: resultVal, unit, expected_range, status, technician, equipment_used, notes } = req.body;
    const r = await pool.query(
      `INSERT INTO lab_results (batch_id, test_type, date, result, unit, expected_range, status, technician, equipment_used, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [batch_id, test_type, date || null, resultVal, unit, expected_range, status || 'pending', technician, equipment_used, notes]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { batch_id, test_type, date, result: resultVal, unit, expected_range, status, technician, equipment_used, notes } = req.body;
    const r = await pool.query(
      `UPDATE lab_results SET batch_id=$1, test_type=$2, date=$3, result=$4, unit=$5, expected_range=$6, status=$7, technician=$8, equipment_used=$9, notes=$10
       WHERE id=$11 RETURNING *`,
      [batch_id, test_type, date || null, resultVal, unit, expected_range, status, technician, equipment_used, notes, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM lab_results WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
