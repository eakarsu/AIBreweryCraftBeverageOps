const router = require('express').Router();
const pool = require('../db');

// GET /api/analytics/distribution - top accounts by volume
router.get('/distribution', async (req, res) => {
  try {
    const topAccounts = await pool.query(`
      SELECT
        distributor, region,
        SUM(quantity) AS total_quantity,
        SUM(total) AS total_revenue,
        COUNT(*) AS order_count,
        MAX(order_date) AS last_order_date,
        STRING_AGG(DISTINCT product, ', ') AS products
      FROM distributions
      WHERE distributor IS NOT NULL
      GROUP BY distributor, region
      ORDER BY total_quantity DESC
      LIMIT 20
    `);

    const productVolume = await pool.query(`
      SELECT product, SUM(quantity) AS total_quantity, SUM(total) AS total_revenue, COUNT(*) AS shipment_count
      FROM distributions WHERE product IS NOT NULL
      GROUP BY product ORDER BY total_quantity DESC LIMIT 10
    `);

    const regionVolume = await pool.query(`
      SELECT region, SUM(quantity) AS total_quantity, SUM(total) AS total_revenue, COUNT(DISTINCT distributor) AS distributor_count
      FROM distributions WHERE region IS NOT NULL
      GROUP BY region ORDER BY total_quantity DESC
    `);

    const monthlyTrend = await pool.query(`
      SELECT DATE_TRUNC('month', order_date::date) AS month, SUM(quantity) AS total_quantity, SUM(total) AS total_revenue, COUNT(*) AS order_count
      FROM distributions
      WHERE order_date IS NOT NULL AND order_date::date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', order_date::date) ORDER BY month DESC
    `);

    res.json({
      success: true,
      data: {
        top_accounts: topAccounts.rows,
        product_volume: productVolume.rows,
        region_volume: regionVolume.rows,
        monthly_trend: monthlyTrend.rows,
      },
    });
  } catch (err) {
    console.error('Error fetching distribution analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analytics/revenue - revenue & expense breakdown
router.get('/revenue', async (req, res) => {
  try {
    const monthlyRevenue = await pool.query(`
      SELECT
        DATE_TRUNC('month', date::date) AS month,
        type,
        category,
        SUM(amount) AS total,
        COUNT(*) AS record_count
      FROM financial_records
      WHERE date IS NOT NULL AND date::date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', date::date), type, category
      ORDER BY month DESC, type
    `);

    const categoryBreakdown = await pool.query(`
      SELECT type, category, SUM(amount) AS total, COUNT(*) AS count
      FROM financial_records
      GROUP BY type, category ORDER BY total DESC
    `);

    const posRevenue = await pool.query(`
      SELECT
        DATE_TRUNC('month', date::date) AS month,
        SUM(total) AS total_revenue,
        SUM(tip) AS total_tips,
        COUNT(*) AS transaction_count,
        AVG(total) AS avg_transaction
      FROM pos_transactions
      WHERE date IS NOT NULL AND date::date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', date::date) ORDER BY month DESC
    `);

    const paymentMethods = await pool.query(`
      SELECT payment_method, COUNT(*) AS count, SUM(total) AS total_revenue
      FROM pos_transactions WHERE payment_method IS NOT NULL
      GROUP BY payment_method ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        monthly_revenue: monthlyRevenue.rows,
        category_breakdown: categoryBreakdown.rows,
        pos_revenue: posRevenue.rows,
        payment_methods: paymentMethods.rows,
      },
    });
  } catch (err) {
    console.error('Error fetching revenue analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analytics/quality - lab results quality trends
router.get('/quality', async (req, res) => {
  try {
    const passFailByTest = await pool.query(`
      SELECT test_type, status, COUNT(*) AS count
      FROM lab_results WHERE test_type IS NOT NULL
      GROUP BY test_type, status ORDER BY test_type, status
    `);

    const passRateByBatch = await pool.query(`
      SELECT
        batch_id,
        COUNT(*) AS total_tests,
        SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) AS passed,
        SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) AS failed,
        ROUND(100.0 * SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) / COUNT(*), 1) AS pass_rate_pct
      FROM lab_results WHERE batch_id IS NOT NULL
      GROUP BY batch_id ORDER BY total_tests DESC LIMIT 20
    `);

    const recentFailures = await pool.query(`
      SELECT id, batch_id, test_type, result, expected_range, date, technician, notes
      FROM lab_results WHERE status = 'fail'
      ORDER BY date DESC LIMIT 20
    `);

    const monthlyTrend = await pool.query(`
      SELECT
        DATE_TRUNC('month', date::date) AS month,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) AS passed,
        SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) AS failed
      FROM lab_results
      WHERE date IS NOT NULL AND date::date >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', date::date) ORDER BY month DESC
    `);

    res.json({
      success: true,
      data: {
        pass_fail_by_test: passFailByTest.rows,
        pass_rate_by_batch: passRateByBatch.rows,
        recent_failures: recentFailures.rows,
        monthly_trend: monthlyTrend.rows,
      },
    });
  } catch (err) {
    console.error('Error fetching quality analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/analytics/production - batch production overview
router.get('/production', async (req, res) => {
  try {
    const batchesByStyle = await pool.query(`
      SELECT style, COUNT(*) AS batch_count, AVG(abv) AS avg_abv, AVG(ibu) AS avg_ibu
      FROM batches WHERE style IS NOT NULL GROUP BY style ORDER BY batch_count DESC
    `);

    const batchesByStatus = await pool.query(`
      SELECT status, COUNT(*) AS count FROM batches GROUP BY status ORDER BY count DESC
    `);

    const recentBatches = await pool.query(`
      SELECT id, batch_number, recipe_name, style, status, brew_date, abv, ibu, batch_size_gallons
      FROM batches ORDER BY created_at DESC LIMIT 10
    `);

    const tankUtilization = await pool.query(`
      SELECT status, COUNT(*) AS count, SUM(capacity_gallons) AS total_capacity
      FROM tanks GROUP BY status ORDER BY count DESC
    `);

    res.json({
      success: true,
      data: {
        batches_by_style: batchesByStyle.rows,
        batches_by_status: batchesByStatus.rows,
        recent_batches: recentBatches.rows,
        tank_utilization: tankUtilization.rows,
      },
    });
  } catch (err) {
    console.error('Error fetching production analytics:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
