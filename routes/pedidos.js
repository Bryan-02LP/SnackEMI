// ════════════════════════════════════════════════════════════
// routes/pedidos.js
// ════════════════════════════════════════════════════════════

const router           = require('express').Router();
const pool             = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── LISTAR ──
router.get('/', requireAuth, async (req, res) => {
  const { estado } = req.query;
  const isAdmin = ['admin','encargado'].includes(req.user.role);

  let sql  = `SELECT p.*, u.nombre_completo AS estudiante, u.codigo_saga
              FROM pedidos p
              INNER JOIN usuarios u ON p.usuario_id = u.usuario_id
              WHERE 1=1`;
  const args = [];

  if (!isAdmin) {
    args.push(req.user.uid);
    sql += ` AND p.usuario_id = $${args.length}`;
  }
  if (estado) { args.push(estado); sql += ` AND p.estado = $${args.length}`; }
  sql += ' ORDER BY p.fecha_pedido DESC';

  try {
    const { rows } = await pool.query(sql, args);
    // Agregar items a cada pedido
    for (const ped of rows) {
      const det = await pool.query(
        `SELECT dp.cantidad, dp.precio_unit, dp.subtotal, pr.nombre AS producto, pr.imagen_ruta
         FROM detalle_pedidos dp
         INNER JOIN productos pr ON dp.producto_id = pr.producto_id
         WHERE dp.pedido_id = $1`,
        [ped.pedido_id]
      );
      ped.items = det.rows;
    }
    res.json({ success: true, data: rows, total: rows.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// ── CREAR ──
router.post('/', requireAuth, async (req, res) => {
  const { items, horaRecogida, metodoPago, observaciones } = req.body;
  if (!items || items.length === 0)
    return res.status(400).json({ error: 'El carrito está vacío' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Generar código
    const seq    = await client.query("SELECT nextval('seq_pedidos')");
    const codigo = `#EMI-${String(seq.rows[0].nextval).padStart(4,'0')}`;

    // Validar stock y calcular total
    let total  = 0;
    const lineas = [];
    for (const item of items) {
      const prod = await client.query(
        'SELECT producto_id, nombre, precio, stock_actual, estado FROM productos WHERE producto_id = $1',
        [item.id]
      );
      const p = prod.rows[0];
      if (!p) throw new Error(`Producto ${item.id} no encontrado`);
      if (p.estado === 'agotado' || p.stock_actual < item.qty)
        throw new Error(`Stock insuficiente: ${p.nombre}`);
      lineas.push({ id: p.producto_id, qty: item.qty, precio: p.precio, nombre: p.nombre });
      total += p.precio * item.qty;
    }

    // Insertar pedido
    const ins = await client.query(
      `INSERT INTO pedidos (codigo, usuario_id, hora_recogida, total, metodo_pago, estado, observaciones)
       VALUES ($1,$2,$3,$4,$5,'pendiente',$6) RETURNING pedido_id`,
      [codigo, req.user.uid, horaRecogida||'10 minutos', total, metodoPago||'QR', observaciones||'']
    );
    const pedidoId = ins.rows[0].pedido_id;

    // Detalle + descontar stock
    for (const l of lineas) {
      await client.query(
        `INSERT INTO detalle_pedidos (pedido_id, producto_id, cantidad, precio_unit)
         VALUES ($1,$2,$3,$4)`,
        [pedidoId, l.id, l.qty, l.precio]
      );
      await client.query(
        `UPDATE productos
         SET stock_actual = stock_actual - $1,
             estado = CASE WHEN stock_actual - $1 <= 0 THEN 'agotado' ELSE estado END,
             fecha_actualizacion = NOW()
         WHERE producto_id = $2`,
        [l.qty, l.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, pedidoId, codigo, total });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(e.message.includes('Stock') ? 409 : 500)
       .json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── ACTUALIZAR ESTADO ──
router.put('/:id', requireAdmin, async (req, res) => {
  const { estado } = req.body;
  const validos = ['pendiente','preparando','listo','entregado','cancelado'];
  if (!validos.includes(estado))
    return res.status(400).json({ error: 'Estado inválido' });

  try {
    const r = await pool.query(
      'UPDATE pedidos SET estado=$1 WHERE pedido_id=$2 RETURNING pedido_id',
      [estado, req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Pedido no encontrado' });

    // Si se cancela → devolver stock
    if (estado === 'cancelado') {
      const items = await pool.query(
        'SELECT producto_id, cantidad FROM detalle_pedidos WHERE pedido_id=$1',
        [req.params.id]
      );
      for (const i of items.rows) {
        await pool.query(
          `UPDATE productos SET stock_actual = stock_actual + $1,
           estado = CASE WHEN estado='agotado' THEN 'activo' ELSE estado END
           WHERE producto_id = $2`,
          [i.cantidad, i.producto_id]
        );
      }
    }
    res.json({ success: true, mensaje: `Pedido → ${estado}` });
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

module.exports = router;


// ════════════════════════════════════════════════════════════
// routes/stock.js  (exportado desde el mismo archivo por brevedad)
// Crea el archivo routes/stock.js por separado si prefieres
// ════════════════════════════════════════════════════════════
