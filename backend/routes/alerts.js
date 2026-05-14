const router = require('express').Router();
const pool = require('../db');

// GET /api/alerts — aggregate all operational alerts
router.get('/', async (req, res) => {
  const alerts = [];

  // Low stock materials
  try {
    const lowStock = await pool.query(`
      SELECT id, name, category, quantity, reorder_point, unit,
             (reorder_point - quantity) AS shortage
      FROM raw_materials
      WHERE quantity IS NOT NULL AND reorder_point IS NOT NULL AND quantity <= reorder_point
      ORDER BY shortage DESC
      LIMIT 20
    `);
    lowStock.rows.forEach(r => {
      alerts.push({
        type: 'low_stock',
        severity: r.quantity <= 0 ? 'critical' : 'warning',
        title: `Low stock: ${r.name}`,
        detail: `${r.quantity} ${r.unit || ''} remaining (reorder at ${r.reorder_point})`,
        resource_id: r.id,
        resource: 'raw_materials',
      });
    });
  } catch (_) {}

  // Overdue equipment maintenance
  try {
    const overdueEquip = await pool.query(`
      SELECT id, name, type, next_maintenance, status, location
      FROM equipment
      WHERE next_maintenance IS NOT NULL
        AND next_maintenance::date < NOW()::date
        AND status != 'decommissioned'
      ORDER BY next_maintenance ASC
      LIMIT 20
    `);
    overdueEquip.rows.forEach(r => {
      const days = Math.floor((Date.now() - new Date(r.next_maintenance)) / 86400000);
      alerts.push({
        type: 'maintenance_overdue',
        severity: days > 14 ? 'critical' : 'warning',
        title: `Maintenance overdue: ${r.name}`,
        detail: `Due ${r.next_maintenance ? new Date(r.next_maintenance).toLocaleDateString() : 'unknown'} (${days} day${days !== 1 ? 's' : ''} ago)`,
        resource_id: r.id,
        resource: 'equipment',
      });
    });
  } catch (_) {}

  // Overdue CIP schedules
  try {
    const overdueCIP = await pool.query(`
      SELECT id, equipment, scheduled_date, cip_type, operator
      FROM cip_schedules
      WHERE status IN ('scheduled', 'overdue')
        AND scheduled_date IS NOT NULL
        AND scheduled_date::date < NOW()::date
      ORDER BY scheduled_date ASC
      LIMIT 20
    `);
    overdueCIP.rows.forEach(r => {
      const days = Math.floor((Date.now() - new Date(r.scheduled_date)) / 86400000);
      alerts.push({
        type: 'cip_overdue',
        severity: days > 7 ? 'critical' : 'warning',
        title: `CIP overdue: ${r.equipment}`,
        detail: `${r.cip_type || 'CIP'} scheduled for ${r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString() : 'unknown'} (${days} day${days !== 1 ? 's' : ''} overdue)`,
        resource_id: r.id,
        resource: 'cip_schedules',
      });
    });
  } catch (_) {}

  // Recent lab failures
  try {
    const labFails = await pool.query(`
      SELECT id, batch_id, test_type, result, expected_range, date
      FROM lab_results
      WHERE status = 'fail'
        AND date IS NOT NULL AND date::date >= NOW() - INTERVAL '7 days'
      ORDER BY date DESC LIMIT 10
    `);
    labFails.rows.forEach(r => {
      alerts.push({
        type: 'lab_failure',
        severity: 'critical',
        title: `Lab failure: ${r.test_type} — Batch ${r.batch_id}`,
        detail: `Result: ${r.result} (expected: ${r.expected_range || 'N/A'})`,
        resource_id: r.id,
        resource: 'lab_results',
      });
    });
  } catch (_) {}

  // Sort: critical first, then by type
  alerts.sort((a, b) => {
    const sev = { critical: 0, warning: 1 };
    return (sev[a.severity] ?? 2) - (sev[b.severity] ?? 2);
  });

  res.json({
    success: true,
    data: alerts,
    summary: {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
    },
  });
});

module.exports = router;
