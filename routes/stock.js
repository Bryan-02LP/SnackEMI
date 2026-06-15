// routes/stock.js
const router           = require('express').Router();
const pool             = require('../db');
const { requireAdmin } = require('../middleware/auth');

// ── LISTAR STOCK ──
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.producto_id, p.nombre, p.stock_actual, p.stock_minimo,
             p.estado, p.imagen_ruta, c.nombre AS categoria,
             CASE
               WHEN p.stock_actual = 0               THEN 'critico'
               WHEN p.stock_actual <= p.stock_minimo  THEN 'bajo'
               ELSE 'ok'
             END AS nivel_stock
      FROM productos p
      INNER JOIN categorias c ON p.categoria_id = c.categoria_id
      WHERE p.estado <> 'inactivo'
      ORDER BY CASE nivel_stock WHEN 'critico' THEN 1 WHEN 'bajo' THEN 2 ELSE 3 END, p.nombre
    `);
    const alertas = rows.filter(r => r.nivel_stock !== 'ok');
    res.json({ success: true, data: rows, alertas, total: rows.length });
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener stock' });
  }
});

// ── AJUSTAR STOCK ──
router.post('/ajustar', requireAdmin, async (req, res) => {
  const { productoId, cantidad, tipo, motivo } = req.body;
  if (!productoId || cantidad === undefined)
    return res.status(400).json({ error: 'productoId y cantidad requeridos' });

  try {
    const prod = await pool.query(
      'SELECT nombre, stock_actual FROM productos WHERE producto_id=$1', [productoId]
    );
    if (!prod.rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });

    const ant    = prod.rows[0].stock_actual;
    const nuevo  = Math.max(0, ant + parseInt(cantidad));

    await pool.query(
      `UPDATE productos SET stock_actual=$1,
       estado = CASE WHEN $1=0 THEN 'agotado' WHEN estado='agotado' THEN 'activo' ELSE estado END,
       fecha_actualizacion=NOW() WHERE producto_id=$2`,
      [nuevo, productoId]
    );
    await pool.query(
      `INSERT INTO movimientos_stock (producto_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [productoId, tipo||'ajuste', parseInt(cantidad), ant, nuevo, motivo||'Ajuste manual', req.user?.uid||null]
    );

    res.json({ success: true, stockAnterior: ant, stockNuevo: nuevo,
               mensaje: `Stock de "${prod.rows[0].nombre}" actualizado a ${nuevo}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al ajustar stock' });
  }
});

// ── CATEGORÍAS ──
router.get('/categorias', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM categorias WHERE activo=true ORDER BY orden'
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ error: 'Error' });
  }
});

// ── DASHBOARD STATS ──
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const [activos, pedidosHoy, ventasHoy, stockBajo, pendientes, top] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM productos WHERE estado='activo'"),
      pool.query("SELECT COUNT(*) FROM pedidos WHERE DATE(fecha_pedido)=CURRENT_DATE AND estado<>'cancelado'"),
      pool.query("SELECT COALESCE(SUM(total),0) FROM pedidos WHERE DATE(fecha_pedido)=CURRENT_DATE AND estado<>'cancelado'"),
      pool.query("SELECT COUNT(*) FROM productos WHERE stock_actual<=stock_minimo AND estado<>'inactivo'"),
      pool.query("SELECT COUNT(*) FROM pedidos WHERE estado='pendiente'"),
      pool.query(`SELECT pr.nombre, SUM(dp.cantidad) AS total_vendido
                  FROM detalle_pedidos dp
                  INNER JOIN productos pr ON dp.producto_id=pr.producto_id
                  INNER JOIN pedidos ped ON dp.pedido_id=ped.pedido_id
                  WHERE DATE(ped.fecha_pedido)=CURRENT_DATE AND ped.estado<>'cancelado'
                  GROUP BY pr.nombre ORDER BY total_vendido DESC LIMIT 5`),
    ]);
    res.json({
      success: true,
      productosActivos:  parseInt(activos.rows[0].count),
      pedidosHoy:        parseInt(pedidosHoy.rows[0].count),
      ventasHoy:         parseFloat(ventasHoy.rows[0].coalesce),
      stockBajo:         parseInt(stockBajo.rows[0].count),
      pedidosPendientes: parseInt(pendientes.rows[0].count),
      topProductos:      top.rows,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener stats' });
  }
});

module.exports = router;
