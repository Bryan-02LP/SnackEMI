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

// ── 404 para rutas de API desconocidas ──
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// ── RUTA PRINCIPAL → devuelve el HTML ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── MANEJADOR GLOBAL DE ERRORES ──
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ── INICIAR SERVIDOR ──
const server = app.listen(PORT, () => {
  console.log(`\n🍔 SnackEMI corriendo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}\n`);
});

// ── CIERRE LIMPIO (evita EADDRINUSE al reiniciar) ──
function shutdown(signal) {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(() => {
    console.log('Servidor cerrado correctamente.');
    process.exit(0);
  });
  // Forzar cierre si tarda más de 5 segundos
  setTimeout(() => process.exit(1), 5000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
