// ════════════════════════════════════════════════════════════
// middleware/auth.js — Verificación de tokens JWT
// ════════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');

// Verifica que haya token válido
function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Solo admin o encargado
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!['admin', 'encargado'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
