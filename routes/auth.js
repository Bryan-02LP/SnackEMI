// ════════════════════════════════════════════════════════════
// routes/auth.js
// POST /api/auth/login
// POST /api/auth/register
// POST /api/auth/admin-login
// ════════════════════════════════════════════════════════════

const router        = require('express').Router();
const bcrypt        = require('bcryptjs');
const jwt           = require('jsonwebtoken');
const pool          = require('../db');
const { requireAdmin } = require('../middleware/auth');

const SAGA_REGEX = /^[A-Z]\d{4,6}-[A-Z]$/i;

function makeToken(id, role) {
  return jwt.sign({ uid: id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// ── LOGIN ──
router.post('/login', async (req, res) => {
  const { saga, password } = req.body;
  if (!saga || !password)
    return res.status(400).json({ error: 'Campos requeridos: saga, password' });

  try {
    const { rows } = await pool.query(
      `SELECT u.usuario_id, u.nombre_completo, u.ci, u.codigo_saga,
              u.password_hash, u.activo, r.nombre_rol
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.rol_id
       WHERE u.codigo_saga = $1 OR u.ci = $1`,
      [saga.toUpperCase()]
    );

    const user = rows[0];
    if (!user)       return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!user.activo) return res.status(403).json({ error: 'Cuenta desactivada' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Contraseña incorrecta' });

    // Actualizar último acceso
    await pool.query(
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE usuario_id = $1',
      [user.usuario_id]
    );

    res.json({
      success: true,
      token: makeToken(user.usuario_id, user.nombre_rol),
      user: {
        id:   user.usuario_id,
        name: user.nombre_completo,
        ci:   user.ci,
        saga: user.codigo_saga,
        role: user.nombre_rol,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── REGISTER ──
router.post('/register', async (req, res) => {
  const { name, ci, saga, password } = req.body;

  if (!name || !ci || !saga || !password)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  if (!SAGA_REGEX.test(saga))
    return res.status(400).json({ error: 'Código SAGA inválido. Formato: A30001-X' });

  try {
    // Verificar duplicado
    const dup = await pool.query(
      'SELECT 1 FROM usuarios WHERE ci = $1 OR codigo_saga = $2',
      [ci, saga.toUpperCase()]
    );
    if (dup.rows.length > 0)
      return res.status(409).json({ error: 'CI o código SAGA ya registrado' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO usuarios (nombre_completo, ci, codigo_saga, password_hash, rol_id)
       VALUES ($1, $2, $3, $4, 1) RETURNING usuario_id`,
      [name, ci, saga.toUpperCase(), hash]
    );

    const id = rows[0].usuario_id;
    res.status(201).json({
      success: true,
      token: makeToken(id, 'estudiante'),
      user: { id, name, ci, saga: saga.toUpperCase(), role: 'estudiante' },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── ADMIN LOGIN ──
router.post('/admin-login', async (req, res) => {
  const { usuario, codigoAdmin } = req.body;
  if (!usuario || !codigoAdmin)
    return res.status(400).json({ error: 'Campos requeridos: usuario, codigoAdmin' });

  // Código global desde .env
  if (usuario === 'admin' && codigoAdmin === process.env.ADMIN_CODE) {
    return res.json({
      success: true,
      token: makeToken(0, 'admin'),
      user: { id: 0, name: 'Admin EMI', role: 'admin' },
    });
  }

  // O buscar encargado en BD
  try {
    const { rows } = await pool.query(
      `SELECT u.usuario_id, u.nombre_completo, u.codigo_admin, r.nombre_rol
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.rol_id
       WHERE u.codigo_saga = $1 AND r.nombre_rol IN ('admin','encargado')`,
      [usuario.toUpperCase()]
    );
    const admin = rows[0];
    if (!admin || admin.codigo_admin !== codigoAdmin)
      return res.status(401).json({ error: 'Credenciales incorrectas' });

    res.json({
      success: true,
      token: makeToken(admin.usuario_id, admin.nombre_rol),
      user: { id: admin.usuario_id, name: admin.nombre_completo, role: admin.nombre_rol },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── LISTAR ESTUDIANTES (admin) ──
router.get('/students', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.usuario_id, u.nombre_completo, u.ci, u.codigo_saga,
             u.fecha_registro, u.ultimo_acceso,
             COUNT(p.pedido_id) AS total_pedidos
      FROM usuarios u
      LEFT JOIN pedidos p ON u.usuario_id = p.usuario_id
      INNER JOIN roles r ON u.rol_id = r.rol_id
      WHERE r.nombre_rol = 'estudiante' AND u.activo = true
      GROUP BY u.usuario_id, u.nombre_completo, u.ci, u.codigo_saga,
               u.fecha_registro, u.ultimo_acceso
      ORDER BY u.fecha_registro DESC
    `);
    res.json({ success: true, data: rows, total: rows.length });
  } catch(e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener estudiantes' });
  }
});

module.exports = router;
