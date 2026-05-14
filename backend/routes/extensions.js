// Apply pass 5 extensions for AIBreweryCraftBeverageOps.
// Backlog implemented:
//   1. Notifications (email/SMS/push) — NEEDS-CREDS
//        Required env: SMTP_HOST,SMTP_USER,SMTP_PASS  OR  TWILIO_SID,TWILIO_TOKEN,TWILIO_FROM
//        OR FCM_SERVER_KEY for push.
//   2. Reporting / export (TOO-RISKY) — JSON + CSV export, additive only.
//   3. Outbound webhook delivery (TOO-RISKY) — in-process delivery (best-effort, fire-and-forget).
//   4. Multi-agent orchestration (NEEDS-PRODUCT-DECISION) — see PRODUCT-DECISION below.
//   5. RAG over brew logs/recipes (NEEDS-PRODUCT-DECISION) — in-memory bag-of-words stub.
//   6. White-label / reseller (NEEDS-PRODUCT-DECISION) — tenant_branding table.
//
// Mounted by ../server.js (additive). All endpoints require auth via the global auth middleware.

const router = require('express').Router();
const pool = require('../db');
const { callOpenRouter, parseAIJson, saveAIResult, DEFAULT_MODEL } = require('../lib/aiHelpers');

// Bootstrap pass-5 tables (lazy, idempotent).
let bootstrapped = false;
async function bootstrap() {
  if (bootstrapped) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        channel VARCHAR(40),
        recipient VARCHAR(255),
        subject VARCHAR(255),
        body TEXT,
        status VARCHAR(40) DEFAULT 'queued',
        provider_response TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id SERIAL PRIMARY KEY,
        webhook_id INTEGER,
        event VARCHAR(80),
        payload JSONB,
        status_code INTEGER,
        response_body TEXT,
        error TEXT,
        attempted_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

      CREATE TABLE IF NOT EXISTS agent_runs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        topology VARCHAR(40),
        objective TEXT,
        steps JSONB,
        status VARCHAR(40) DEFAULT 'queued',
        result JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rag_documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        source VARCHAR(40),
        ref_id INTEGER,
        title VARCHAR(255),
        text TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_rag_documents_source ON rag_documents(source);

      CREATE TABLE IF NOT EXISTS tenant_branding (
        id SERIAL PRIMARY KEY,
        owner_user_id INTEGER,
        tenant_slug VARCHAR(80) UNIQUE,
        brand_name VARCHAR(120),
        primary_color VARCHAR(20),
        logo_url TEXT,
        contact_email VARCHAR(255),
        config JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    bootstrapped = true;
  } catch (e) {
    console.warn('[extensions] bootstrap warning:', e.message);
  }
}
bootstrap();

// ----------------------------- 1. Notifications -----------------------------

function notificationProviderStatus() {
  const missing = [];
  // PRODUCT-DECISION: SMTP is the default email provider; Twilio for SMS; FCM for push.
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    missing.push('SMTP_HOST', 'SMTP_USER', 'SMTP_PASS');
  }
  if (!process.env.TWILIO_SID || !process.env.TWILIO_TOKEN || !process.env.TWILIO_FROM) {
    missing.push('TWILIO_SID', 'TWILIO_TOKEN', 'TWILIO_FROM');
  }
  if (!process.env.FCM_SERVER_KEY) {
    missing.push('FCM_SERVER_KEY');
  }
  return missing;
}

router.get('/notifications/status', async (req, res) => {
  const missing = notificationProviderStatus();
  res.json({
    email: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    sms: !!(process.env.TWILIO_SID && process.env.TWILIO_TOKEN && process.env.TWILIO_FROM),
    push: !!process.env.FCM_SERVER_KEY,
    missing
  });
});

router.post('/notifications/send', async (req, res) => {
  const { channel, recipient, subject, body } = req.body || {};
  if (!channel || !recipient) {
    return res.status(400).json({ error: 'channel and recipient required' });
  }
  // Determine which env block is needed for channel.
  let needed = [];
  if (channel === 'email') needed = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  else if (channel === 'sms') needed = ['TWILIO_SID', 'TWILIO_TOKEN', 'TWILIO_FROM'];
  else if (channel === 'push') needed = ['FCM_SERVER_KEY'];
  else return res.status(400).json({ error: 'channel must be email | sms | push' });
  const missing = needed.filter(k => !process.env[k]);
  if (missing.length) {
    return res.status(503).json({ error: 'Provider not configured', missing });
  }
  // Persist queued notification (no actual outbound provider call here — additive only).
  try {
    const r = await pool.query(
      `INSERT INTO notifications (user_id, channel, recipient, subject, body, status)
       VALUES ($1, $2, $3, $4, $5, 'queued') RETURNING id, channel, recipient, subject, status, created_at`,
      [req.user?.id || null, channel, recipient, subject || null, body || null]
    );
    res.status(202).json({ accepted: true, notification: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, channel, recipient, subject, status, created_at FROM notifications
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user?.id || null]
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------- 2. Reporting / export -----------------------------

function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const escape = v => {
    if (v == null) return '';
    if (typeof v === 'object') v = JSON.stringify(v);
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map(c => escape(r[c])).join(','));
  return lines.join('\n');
}

const REPORT_QUERIES = {
  // PRODUCT-DECISION: minimum-viable report set; expandable later.
  batches:        'SELECT id, batch_number, recipe_id, status, started_at, completed_at FROM batches ORDER BY id DESC LIMIT 1000',
  'lab-results':  'SELECT id, batch_id, test_name, result_value, units, recorded_at FROM lab_results ORDER BY id DESC LIMIT 1000',
  inventory:      'SELECT id, name, quantity, unit, reorder_threshold FROM raw_materials ORDER BY name LIMIT 1000',
  distributions:  'SELECT id, customer_name, status, shipped_at, total_amount FROM distributions ORDER BY id DESC LIMIT 1000',
};

router.get('/reports/:type', async (req, res) => {
  const t = req.params.type;
  const sql = REPORT_QUERIES[t];
  if (!sql) return res.status(400).json({ error: 'unknown report type', allowed: Object.keys(REPORT_QUERIES) });
  try {
    const r = await pool.query(sql);
    if ((req.query.format || 'json') === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${t}.csv"`);
      return res.send(toCSV(r.rows));
    }
    res.json({ type: t, count: r.rows.length, rows: r.rows });
  } catch (e) {
    // Schema-tolerant: return empty if table missing.
    res.json({ type: t, count: 0, rows: [], note: e.message });
  }
});

// ----------------------------- 3. Outbound webhook delivery -----------------------------

async function deliverWebhook(hook, event, payload) {
  // PRODUCT-DECISION: best-effort fire-and-forget delivery, 1 attempt, 5 s timeout.
  // Larger systems would use a job queue (BullMQ/RabbitMQ) — out of scope here.
  let fetchFn;
  try { fetchFn = require('node-fetch'); } catch (_) { fetchFn = global.fetch; }
  if (!fetchFn) return;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  let status = null, body = '', err = null;
  try {
    const resp = await fetchFn(hook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
        ...(hook.secret ? { 'X-Webhook-Secret': hook.secret } : {})
      },
      body: JSON.stringify({ event, payload, ts: new Date().toISOString() }),
      signal: ctrl.signal
    });
    status = resp.status;
    body = (await resp.text()).slice(0, 1000);
  } catch (e) {
    err = e.message;
  } finally {
    clearTimeout(t);
  }
  try {
    await pool.query(
      `INSERT INTO webhook_deliveries (webhook_id, event, payload, status_code, response_body, error)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [hook.id, event, JSON.stringify(payload || {}), status, body, err]
    );
  } catch (_) {}
}

router.post('/webhook-deliveries/dispatch', async (req, res) => {
  const { event, payload } = req.body || {};
  if (!event) return res.status(400).json({ error: 'event required' });
  try {
    const r = await pool.query(`SELECT id, url, events, secret FROM webhooks WHERE active = true`);
    const matched = r.rows.filter(h => Array.isArray(h.events) && h.events.includes(event));
    // Fire-and-forget; do not await.
    for (const h of matched) deliverWebhook(h, event, payload);
    res.status(202).json({ accepted: true, dispatched: matched.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/webhook-deliveries', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, webhook_id, event, status_code, error, attempted_at FROM webhook_deliveries
       ORDER BY id DESC LIMIT 200`
    );
    res.json(r.rows);
  } catch (e) {
    res.json([]);
  }
});

// ----------------------------- 4. Multi-agent orchestration -----------------------------

router.post('/agents/run', async (req, res) => {
  // PRODUCT-DECISION: topology = "linear-planner" (planner -> tool agents -> writer).
  // Concrete topologies (graph, swarm, etc) deferred. Stores plan + (if AI key) plan from LLM.
  const { objective, topology = 'linear-planner', context = {} } = req.body || {};
  if (!objective) return res.status(400).json({ error: 'objective required' });

  let steps = [
    { agent: 'planner', task: 'decompose objective', status: 'planned' },
    { agent: 'data-fetcher', task: 'gather brewery context', status: 'planned' },
    { agent: 'analyst', task: 'analyze and recommend', status: 'planned' },
    { agent: 'writer', task: 'compose final response', status: 'planned' }
  ];
  let resultObj = null;
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const out = await callOpenRouter(
        `You are a brewery operations multi-agent planner. Output strict JSON: {"plan":[{"agent":"string","task":"string"}],"summary":"string"}`,
        `Objective: ${objective}\nContext: ${JSON.stringify(context).slice(0, 4000)}`,
        { temperature: 0.3, max_tokens: 1200 }
      );
      const parsed = parseAIJson(out);
      if (parsed && Array.isArray(parsed.plan)) {
        steps = parsed.plan.map(s => ({ ...s, status: 'planned' }));
        resultObj = { summary: parsed.summary || null };
      }
    } catch (e) { resultObj = { warning: 'planner LLM failed', detail: e.message }; }
  }

  try {
    const r = await pool.query(
      `INSERT INTO agent_runs (user_id, topology, objective, steps, status, result)
       VALUES ($1, $2, $3, $4, 'planned', $5) RETURNING id, topology, objective, steps, status, result, created_at`,
      [req.user?.id || null, topology, objective, JSON.stringify(steps), JSON.stringify(resultObj)]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/agents/runs', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, topology, objective, status, created_at FROM agent_runs
       WHERE user_id = $1 ORDER BY id DESC LIMIT 50`,
      [req.user?.id || null]
    );
    res.json(r.rows);
  } catch (e) {
    res.json([]);
  }
});

// ----------------------------- 5. RAG over brew logs / recipes -----------------------------
// PRODUCT-DECISION: in-memory bag-of-words retrieval over rag_documents rows (no vector store).
// Real deployments would use pgvector / Qdrant / Pinecone — out of scope per "no heavy deps" rule.

function tokenize(s) {
  return (s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

function bowScore(qTokens, doc) {
  const dTokens = tokenize(doc.text + ' ' + (doc.title || ''));
  if (!dTokens.length) return 0;
  const set = new Set(dTokens);
  let hit = 0;
  for (const q of qTokens) if (set.has(q)) hit += 1;
  return hit / Math.max(1, qTokens.length);
}

router.post('/rag/index', async (req, res) => {
  const { source, ref_id, title, text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const r = await pool.query(
      `INSERT INTO rag_documents (user_id, source, ref_id, title, text)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, source, ref_id, title, created_at`,
      [req.user?.id || null, source || 'manual', ref_id || null, title || null, text]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/rag/query', async (req, res) => {
  const { query, top_k = 5 } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query required' });
  try {
    const r = await pool.query(`SELECT id, source, ref_id, title, text FROM rag_documents LIMIT 2000`);
    const qT = tokenize(query);
    const scored = r.rows
      .map(d => ({ id: d.id, source: d.source, ref_id: d.ref_id, title: d.title,
                   snippet: (d.text || '').slice(0, 240), score: bowScore(qT, d) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(20, Math.max(1, parseInt(top_k, 10) || 5)));

    if (!process.env.OPENROUTER_API_KEY) {
      return res.json({ retrieved: scored, answer: null,
        note: 'OPENROUTER_API_KEY not set — retrieval only' });
    }
    const ctx = scored.map((s, i) => `[#${i + 1}] ${s.title || ''}\n${s.snippet}`).join('\n\n');
    let out = null, llmErr = null;
    try {
      out = await callOpenRouter(
        `You answer brewery questions strictly using the provided context. If the answer is not present, say "Not in indexed knowledge."`,
        `Context:\n${ctx}\n\nQuestion: ${query}`,
        { temperature: 0.2, max_tokens: 700 }
      );
    } catch (e) { llmErr = e.message; }
    if (out) {
      await saveAIResult(pool, { user_id: req.user?.id, feature: 'rag-query',
        input: { query }, output: { answer: out, retrieved: scored.length },
        raw_text: out, model: DEFAULT_MODEL });
    }
    res.json({ retrieved: scored, answer: out, ...(llmErr ? { llm_error: llmErr } : {}) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------- 6. White-label / reseller -----------------------------
// PRODUCT-DECISION: lightweight tenant_branding table keyed by slug; no auth-tenant binding yet.
// Multi-tenant DB partitioning (RLS or schema-per-tenant) deferred.

router.get('/tenants', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, tenant_slug, brand_name, primary_color, logo_url, contact_email, created_at
       FROM tenant_branding WHERE owner_user_id = $1 ORDER BY id DESC`,
      [req.user?.id || null]
    );
    res.json(r.rows);
  } catch (e) {
    res.json([]);
  }
});

router.post('/tenants', async (req, res) => {
  const { tenant_slug, brand_name, primary_color, logo_url, contact_email, config } = req.body || {};
  if (!tenant_slug) return res.status(400).json({ error: 'tenant_slug required' });
  try {
    const r = await pool.query(
      `INSERT INTO tenant_branding (owner_user_id, tenant_slug, brand_name, primary_color, logo_url, contact_email, config)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_slug) DO UPDATE
         SET brand_name = EXCLUDED.brand_name,
             primary_color = EXCLUDED.primary_color,
             logo_url = EXCLUDED.logo_url,
             contact_email = EXCLUDED.contact_email,
             config = EXCLUDED.config,
             updated_at = NOW()
       RETURNING id, tenant_slug, brand_name, primary_color, logo_url, contact_email, created_at`,
      [req.user?.id || null, tenant_slug, brand_name || null, primary_color || null,
       logo_url || null, contact_email || null, config ? JSON.stringify(config) : null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/tenants/:slug', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, tenant_slug, brand_name, primary_color, logo_url, contact_email, config
       FROM tenant_branding WHERE tenant_slug = $1`,
      [req.params.slug]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'tenant not found' });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
