const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM kegs ORDER BY keg_id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM kegs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { keg_id, beer_name, batch_id, size, fill_date, status, location, distributor, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO kegs (keg_id, beer_name, batch_id, size, fill_date, status, location, distributor, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [keg_id, beer_name, batch_id, size, fill_date || null, status || 'empty', location, distributor, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { keg_id, beer_name, batch_id, size, fill_date, status, location, distributor, notes } = req.body;
    const result = await pool.query(
      `UPDATE kegs SET keg_id=$1, beer_name=$2, batch_id=$3, size=$4, fill_date=$5, status=$6, location=$7, distributor=$8, notes=$9
       WHERE id=$10 RETURNING *`,
      [keg_id, beer_name, batch_id, size, fill_date || null, status, location, distributor, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM kegs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
