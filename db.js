// ════════════════════════════════════════════════════════════
// db.js — Conexión a PostgreSQL (Supabase)
// ════════════════════════════════════════════════════════════

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

// Test de conexión al arrancar
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
  } else {
    console.log('✅ Conectado a PostgreSQL (Supabase)');
    release();
  }
});

module.exports = pool;
