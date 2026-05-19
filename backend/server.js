const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = (() => { try { return require('compression'); } catch (_) { return null; } })();
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const auth = require('./middleware/auth');
const pool = require('./db');
const { ensureAIResultsTable } = require('./lib/aiHelpers');

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

// CORS from env (comma-separated origins)
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:4200,http://localhost:5173')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
}));

if (compression) app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// AI rate limiter: 20 requests per user per hour
// Use the library default ipKeyGenerator helper to safely normalize IPv6 keys when no user.
const { ipKeyGenerator } = require('express-rate-limit');
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req, res) => req.user ? String(req.user.id) : ipKeyGenerator(req.ip),
  message: { error: 'Too many AI requests. Limit is 20 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General rate limiter: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login-specific limiter: 10 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize ai_results table at startup
ensureAIResultsTable(pool).catch(e => console.warn('ai_results init failed:', e.message));

// Apply general limiter to all API routes
app.use('/api', generalLimiter);

// Routes
app.use('/api/auth', loginLimiter, require('./routes/auth'));
app.use('/api/brew-logs', auth, require('./routes/brewLogs'));
app.use('/api/tanks', auth, require('./routes/tanks'));
app.use('/api/raw-materials', auth, require('./routes/rawMaterials'));
app.use('/api/fermentation-logs', auth, require('./routes/fermentationLogs'));
app.use('/api/packaging-runs', auth, require('./routes/packagingRuns'));
app.use('/api/kegs', auth, require('./routes/kegs'));
app.use('/api/pos-transactions', auth, require('./routes/posTransactions'));
app.use('/api/distributions', auth, require('./routes/distributions'));
app.use('/api/lab-results', auth, require('./routes/labResults'));
app.use('/api/equipment', auth, require('./routes/equipment'));
app.use('/api/events', auth, require('./routes/events'));
app.use('/api/loyalty-members', auth, require('./routes/loyaltyMembers'));
app.use('/api/financial-records', auth, require('./routes/financialRecords'));
app.use('/api/cip-schedules', auth, require('./routes/cipSchedules'));
app.use('/api/vendors', auth, require('./routes/vendors'));
app.use('/api/batches', auth, require('./routes/batches'));
app.use('/api/ai', auth, aiRateLimiter, require('./routes/ai'));
app.use('/api/analytics', auth, require('./routes/analytics'));
app.use('/api/alerts', auth, require('./routes/alerts'));
app.use('/api/webhooks', auth, require('./routes/webhooks'));
// Apply pass 5 extensions (notifications, reports, webhook delivery, agents, RAG, white-label)
app.use('/api/ext', auth, require('./routes/extensions'));
// Custom Brewery Views (4 synthesized endpoints)
app.use('/api/custom-views', auth, require('./routes/customViews'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});


app.use('/api/brew-day-agent', require('./routes/brewDayAgent')); // apply pass 6 — audit custom suggestion

app.use('/api/bjcp-rag', require('./routes/bjcpRag')); // apply pass 6 — audit custom suggestion

app.use('/api/fermentation-stream', require('./routes/fermentationStream')); // apply pass 6 — audit custom suggestion

app.use('/api/contract-tenant', require('./routes/contractBreweryTenant')); // apply pass 6 — audit custom suggestion
app.listen(PORT, () => {
  console.log(`Brewery Ops server running on port ${PORT}`);
});

module.exports = app;


// === Batch 01 Gaps & Frontend Mounts ===
app.use('/api/gap-no-vision-based-fermentation-clarity-monitoring', require('./routes/gap_no_vision_based_fermentation_clarity_monitoring'));
app.use('/api/gap-no-ai-customer-feedback-sentiment-loop-into-recipe', require('./routes/gap_no_ai_customer_feedback_sentiment_loop_into_recipe'));
app.use('/api/gap-no-ai-tap-room-demand-forecasting-per-hour', require('./routes/gap_no_ai_tap_room_demand_forecasting_per_hour'));
app.use('/api/gap-no-ai-tasting-note-generator-for-marketing', require('./routes/gap_no_ai_tasting_note_generator_for_marketing'));
app.use('/api/gap-only-8-frontend-pages-despite-21-backend-routes-ui', require('./routes/gap_only_8_frontend_pages_despite_21_backend_routes_ui'));
app.use('/api/gap-no-notification-system-alerts-module-is-storage-on', require('./routes/gap_no_notification_system_alerts_module_is_storage_on'));
app.use('/api/gap-no-export-reporting-module-for-ttb-state-complianc', require('./routes/gap_no_export_reporting_module_for_ttb_state_complianc'));
app.use('/api/gap-no-direct-pos-vendor-api-client-beyond-stored-tran', require('./routes/gap_no_direct_pos_vendor_api_client_beyond_stored_tran'));
app.use('/api/gap-no-iot-sensor-stream-ingestion-layer-for-fermenter', require('./routes/gap_no_iot_sensor_stream_ingestion_layer_for_fermenter'));
