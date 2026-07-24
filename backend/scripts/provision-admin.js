'use strict';

const bcrypt = require('bcryptjs');
const pool = require('../db');

async function provisionAdmin() {
  const email = process.env.PROVISION_ADMIN_EMAIL || process.env.ADMIN_EMAIL;
  const password = process.env.PROVISION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (email, password, name, role, tenant_id)
     VALUES ($1, $2, $3, 'admin', 'runtime-tenant')
     ON CONFLICT (email) DO UPDATE SET password=EXCLUDED.password, role='admin', tenant_id=EXCLUDED.tenant_id`,
    [email.trim().toLowerCase(), passwordHash, 'Runtime Administrator']
  );
}

provisionAdmin()
  .catch((error) => {
    console.error(`Admin provisioning failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
