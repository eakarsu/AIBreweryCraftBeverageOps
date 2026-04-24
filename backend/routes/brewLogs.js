const router = require('express').Router();
const pool = require('../db');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM brew_logs ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching brew logs:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM brew_logs WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { batch_id, recipe_name, style, brew_date, brewer, grain_bill, hops, yeast, mash_temp, og, fg, abv, ibu, volume_gallons, status, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO brew_logs (batch_id, recipe_name, style, brew_date, brewer, grain_bill, hops, yeast, mash_temp, og, fg, abv, ibu, volume_gallons, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [batch_id, recipe_name, style, brew_date || null, brewer, grain_bill, hops, yeast, mash_temp, og, fg, abv, ibu, volume_gallons, status || 'planning', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating brew log:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { batch_id, recipe_name, style, brew_date, brewer, grain_bill, hops, yeast, mash_temp, og, fg, abv, ibu, volume_gallons, status, notes } = req.body;
    const result = await pool.query(
      `UPDATE brew_logs SET batch_id=$1, recipe_name=$2, style=$3, brew_date=$4, brewer=$5, grain_bill=$6, hops=$7, yeast=$8, mash_temp=$9, og=$10, fg=$11, abv=$12, ibu=$13, volume_gallons=$14, status=$15, notes=$16
       WHERE id=$17 RETURNING *`,
      [batch_id, recipe_name, style, brew_date || null, brewer, grain_bill, hops, yeast, mash_temp, og, fg, abv, ibu, volume_gallons, status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM brew_logs WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
