// customViews.js — synthesized brewery-operations views
// Endpoints:
//   GET  /api/custom-views/fermentation-timeline  (VIZ)
//   GET  /api/custom-views/tank-status-board      (VIZ)
//   GET  /api/custom-views/batch-record/:batchId  (NON-VIZ — PDF)
//   GET  /api/custom-views/recipe/:id             (NON-VIZ — recipe editor read)
//   PUT  /api/custom-views/recipe/:id             (NON-VIZ — recipe editor save)

const router = require('express').Router();
const pool = require('../db');
let PDFDocument = null;
try { PDFDocument = require('pdfkit'); } catch (_) { PDFDocument = null; }

// ---------- helper ----------
async function safeQuery(sql, params = []) {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (_) {
    return [];
  }
}

// ---------- 1. VIZ: Fermentation timeline ----------
// Returns per-batch time-series of temp / gravity / pH ready for a multi-line chart.
router.get('/fermentation-timeline', async (req, res) => {
  try {
    const limitBatches = Math.min(8, Math.max(1, parseInt(req.query.batches) || 4));

    // Pick most-recent batches that have fermentation logs
    const batches = await safeQuery(`
      SELECT DISTINCT bl.id, bl.recipe_name, bl.style, bl.brew_date
      FROM brew_logs bl
      JOIN fermentation_logs fl ON fl.batch_id = bl.id
      ORDER BY bl.brew_date DESC NULLS LAST, bl.id DESC
      LIMIT $1
    `, [limitBatches]);

    const series = [];
    for (const b of batches) {
      const points = await safeQuery(`
        SELECT date, temperature, gravity, ph
        FROM fermentation_logs
        WHERE batch_id = $1
        ORDER BY date ASC, id ASC
      `, [b.id]);
      series.push({
        batch_id: b.id,
        recipe_name: b.recipe_name,
        style: b.style,
        brew_date: b.brew_date,
        points: points.map((p, i) => ({
          day: i,
          date: p.date,
          temperature: p.temperature !== null ? Number(p.temperature) : null,
          gravity: p.gravity !== null ? Number(p.gravity) : null,
          ph: p.ph !== null ? Number(p.ph) : null,
        })),
      });
    }

    // Synthesize a flattened chart-friendly grid keyed by day index across batches.
    const maxDays = series.reduce((m, s) => Math.max(m, s.points.length), 0);
    const grid = [];
    for (let d = 0; d < maxDays; d++) {
      const row = { day: d };
      series.forEach(s => {
        const p = s.points[d];
        if (p) {
          row[`grav_${s.batch_id}`] = p.gravity;
          row[`temp_${s.batch_id}`] = p.temperature;
        }
      });
      grid.push(row);
    }

    res.json({
      generated_at: new Date().toISOString(),
      batches: series.map(s => ({
        batch_id: s.batch_id,
        recipe_name: s.recipe_name,
        style: s.style,
        brew_date: s.brew_date,
        point_count: s.points.length,
      })),
      series,
      grid,
    });
  } catch (err) {
    res.status(500).json({ error: 'fermentation timeline failed', detail: err.message });
  }
});

// ---------- 2. VIZ: Tank status board ----------
// Aggregates tanks with their most-recent fermentation reading.
router.get('/tank-status-board', async (req, res) => {
  try {
    const tanks = await safeQuery(`SELECT * FROM tanks ORDER BY name`);
    const enriched = [];
    for (const t of tanks) {
      const latest = await safeQuery(
        `SELECT date, temperature, gravity, ph
         FROM fermentation_logs
         WHERE tank_id = $1
         ORDER BY date DESC, id DESC
         LIMIT 1`,
        [t.id]
      );
      enriched.push({
        id: t.id,
        name: t.name,
        type: t.type,
        status: t.status || 'unknown',
        current_batch: t.current_batch,
        capacity_gallons: t.capacity_gallons ? Number(t.capacity_gallons) : null,
        temperature: t.temperature !== null ? Number(t.temperature) : null,
        pressure_psi: t.pressure_psi !== null ? Number(t.pressure_psi) : null,
        location: t.location,
        latest_reading: latest[0] || null,
      });
    }

    // Group by status for board layout
    const groups = {};
    enriched.forEach(t => {
      const key = (t.status || 'unknown').toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });

    const summary = {
      total: enriched.length,
      in_use: enriched.filter(t => /use/i.test(t.status || '')).length,
      available: enriched.filter(t => /available/i.test(t.status || '')).length,
      cleaning: enriched.filter(t => /clean/i.test(t.status || '')).length,
      maintenance: enriched.filter(t => /maint/i.test(t.status || '')).length,
      total_capacity: enriched.reduce((s, t) => s + (t.capacity_gallons || 0), 0),
    };

    res.json({
      generated_at: new Date().toISOString(),
      summary,
      groups,
      tanks: enriched,
    });
  } catch (err) {
    res.status(500).json({ error: 'tank status board failed', detail: err.message });
  }
});

// ---------- 3. NON-VIZ: Batch record PDF ----------
router.get('/batch-record/:batchId', async (req, res) => {
  try {
    const id = parseInt(req.params.batchId);
    if (!id) return res.status(400).json({ error: 'invalid batchId' });

    const blRows = await safeQuery(`SELECT * FROM brew_logs WHERE id = $1`, [id]);
    if (!blRows.length) return res.status(404).json({ error: 'batch not found' });
    const bl = blRows[0];
    const ferms = await safeQuery(
      `SELECT date, temperature, gravity, ph, dissolved_oxygen, pressure_psi, notes
       FROM fermentation_logs WHERE batch_id = $1 ORDER BY date ASC, id ASC`,
      [id]
    );
    const labs = await safeQuery(
      `SELECT * FROM lab_results WHERE batch_id = $1 ORDER BY id DESC LIMIT 25`,
      [id]
    );

    if (!PDFDocument) {
      // graceful JSON fallback if pdfkit missing
      return res.json({ format: 'json-fallback', brew_log: bl, fermentation: ferms, lab_results: labs });
    }

    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="batch-record-${id}.pdf"`
    );
    doc.pipe(res);

    doc.fontSize(20).fillColor('#b8860b').text('BrewOps AI — Batch Record', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#555').text(`Generated ${new Date().toISOString()}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).fillColor('#000').text(`Batch #${bl.id}: ${bl.recipe_name || ''}`);
    doc.fontSize(11).fillColor('#333');
    doc.moveDown(0.3);
    const kv = (k, v) => doc.text(`${k}: ${v !== undefined && v !== null ? v : '—'}`);
    kv('Style', bl.style);
    kv('Brew date', bl.brew_date);
    kv('Brewer', bl.brewer);
    kv('Status', bl.status);
    kv('OG / FG / ABV / IBU', `${bl.og || '—'} / ${bl.fg || '—'} / ${bl.abv || '—'}% / ${bl.ibu || '—'}`);
    kv('Volume (gal)', bl.volume_gallons);
    kv('Mash temp', bl.mash_temp);
    kv('Yeast', bl.yeast);
    doc.moveDown(0.4);
    doc.fontSize(12).fillColor('#000').text('Grain bill', { underline: true });
    doc.fontSize(10).fillColor('#333').text(bl.grain_bill || '—');
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('#000').text('Hops', { underline: true });
    doc.fontSize(10).fillColor('#333').text(bl.hops || '—');
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('#000').text('Notes', { underline: true });
    doc.fontSize(10).fillColor('#333').text(bl.notes || '—');
    doc.moveDown();

    doc.fontSize(13).fillColor('#b8860b').text('Fermentation log');
    doc.moveDown(0.2);
    if (!ferms.length) {
      doc.fontSize(10).fillColor('#666').text('No fermentation readings recorded.');
    } else {
      doc.fontSize(9).fillColor('#000');
      doc.text('Date         Temp °F   Gravity   pH    DO     Notes');
      ferms.forEach(f => {
        const line = `${String(f.date).slice(0, 10).padEnd(12)} ${String(f.temperature ?? '—').padEnd(8)} ${String(f.gravity ?? '—').padEnd(8)} ${String(f.ph ?? '—').padEnd(5)} ${String(f.dissolved_oxygen ?? '—').padEnd(6)} ${(f.notes || '').slice(0, 60)}`;
        doc.text(line);
      });
    }

    doc.moveDown();
    doc.fontSize(13).fillColor('#b8860b').text(`Lab results (${labs.length})`);
    doc.moveDown(0.2);
    if (!labs.length) {
      doc.fontSize(10).fillColor('#666').text('No lab results recorded.');
    } else {
      doc.fontSize(9).fillColor('#000');
      labs.slice(0, 10).forEach(l => {
        const parts = [];
        for (const [k, v] of Object.entries(l)) {
          if (v === null || v === undefined || k === 'id') continue;
          parts.push(`${k}=${v}`);
        }
        doc.text('• ' + parts.join('  '));
      });
    }

    doc.moveDown();
    doc.fontSize(8).fillColor('#999').text('Confidential — BrewOps AI batch record', { align: 'center' });
    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'batch record failed', detail: err.message });
  }
});

// ---------- 4. NON-VIZ: Recipe editor ----------
router.get('/recipe/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await safeQuery(`SELECT * FROM brew_logs WHERE id = $1`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'recipe not found' });
    res.json({ recipe: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'recipe fetch failed', detail: err.message });
  }
});

router.get('/recipes', async (req, res) => {
  try {
    const rows = await safeQuery(
      `SELECT id, recipe_name, style, brew_date, og, fg, abv, ibu, status
       FROM brew_logs ORDER BY id DESC LIMIT 50`
    );
    res.json({ recipes: rows });
  } catch (err) {
    res.status(500).json({ error: 'recipe list failed', detail: err.message });
  }
});

router.put('/recipe/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    const b = req.body || {};
    const allowed = ['recipe_name', 'style', 'brewer', 'grain_bill', 'hops', 'yeast', 'mash_temp', 'og', 'fg', 'abv', 'ibu', 'volume_gallons', 'notes', 'status'];
    const sets = [];
    const vals = [];
    let i = 1;
    for (const k of allowed) {
      if (b[k] !== undefined) {
        sets.push(`${k} = $${i++}`);
        vals.push(b[k]);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'no fields to update' });
    vals.push(id);
    const sql = `UPDATE brew_logs SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`;
    const rows = await safeQuery(sql, vals);
    if (!rows.length) return res.status(404).json({ error: 'recipe not found' });
    res.json({ ok: true, recipe: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'recipe save failed', detail: err.message });
  }
});

module.exports = router;
