// ════════════════════════════════════════════════════════════
// db.js — Conexión a PostgreSQL (Supabase)
// ════════════════════════════════════════════════════════════

const { Pool } = require('pg');

// Soporta DATABASE_URL (Supabase/producción) o variables individuales (local)
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
    })
  : new Pool({
      user:     process.env.DB_USER,
      password: String(process.env.DB_PASSWORD),
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
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
