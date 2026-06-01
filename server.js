// ════════════════════════════════════════════════════════════
// SNACK EMI — server.js
// Servidor principal Express + PostgreSQL
// ════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (HTML, CSS, JS, imágenes)
app.use(express.static(path.join(__dirname, 'public')));

// ── RUTAS API ──
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/pedidos',   require('./routes/pedidos'));
app.use('/api/stock',     require('./routes/stock'));

// ── RUTA PRINCIPAL → devuelve el HTML ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── INICIAR SERVIDOR ──
app.listen(PORT, () => {
  console.log(`\n🍔 SnackEMI corriendo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}\n`);
});
