const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/brew-logs', require('./routes/brewLogs'));
app.use('/api/tanks', require('./routes/tanks'));
app.use('/api/raw-materials', require('./routes/rawMaterials'));
app.use('/api/fermentation-logs', require('./routes/fermentationLogs'));
app.use('/api/packaging-runs', require('./routes/packagingRuns'));
app.use('/api/kegs', require('./routes/kegs'));
app.use('/api/pos-transactions', require('./routes/posTransactions'));
app.use('/api/distributions', require('./routes/distributions'));
app.use('/api/lab-results', require('./routes/labResults'));
app.use('/api/equipment', require('./routes/equipment'));
app.use('/api/events', require('./routes/events'));
app.use('/api/loyalty-members', require('./routes/loyaltyMembers'));
app.use('/api/financial-records', require('./routes/financialRecords'));
app.use('/api/cip-schedules', require('./routes/cipSchedules'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/ai', require('./routes/ai'));

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

app.listen(PORT, () => {
  console.log(`Brewery Ops server running on port ${PORT}`);
});

module.exports = app;
