const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

if (process.env.NODE_ENV === 'production' && (!process.env.DB_PASSWORD || !process.env.DB_USER || !process.env.DB_NAME)) throw new Error('Production database configuration is incomplete');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.NODE_ENV === 'production' ? process.env.DB_PASSWORD : (process.env.DB_PASSWORD || 'postgres'),
  database: process.env.DB_NAME || 'brewery_ops',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
