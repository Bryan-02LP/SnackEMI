// ════════════════════════════════════════════════════════════
// routes/productos.js
// ════════════════════════════════════════════════════════════

const router   = require('express').Router();
const pool     = require('../db');
const path     = require('path');
const fs       = require('fs');
const { requireAdmin } = require('../middleware/auth');
const { cloudinary, uploadProducto, uploadLogo, uploadQR, useCloudinary, fileUrl } = require('../cloudinary');

// Borra la imagen antigua al editar o eliminar un producto
function deleteOldImage(url) {
  if (!url) return;
  if (useCloudinary && url.includes('cloudinary')) {
    const idx = url.indexOf('/upload/');
    if (idx === -1) return;
    let id = url.slice(idx + 8).replace(/^v\d+\//, '').replace(/\.[^.]+$/, '');
    cloudinary.uploader.destroy(id).catch(() => {});
  } else if (!useCloudinary && url.startsWith('/img/')) {
    const filePath = path.join(__dirname, '../public', url);
    fs.unlink(filePath, () => {});
  }
}

// ── LISTAR ──
router.get('/', async (req, res) => {
  const { cat, destacado } = req.query;
  let sql = `SELECT p.producto_id, p.nombre, p.descripcion, p.precio,
                    p.stock_actual, p.stock_minimo, p.imagen_ruta,
                    p.estado, p.destacado, c.nombre AS categoria, c.icono
             FROM productos p
             INNER JOIN categorias c ON p.categoria_id = c.categoria_id
             WHERE p.estado <> 'inactivo'`;
  const args = [];
  if (cat)       { args.push(cat);  sql += ` AND c.nombre = $${args.length}`; }
  if (destacado) { args.push(true); sql += ` AND p.destacado = $${args.length}`; }
  sql += ' ORDER BY c.orden, p.nombre';
  try {
    const { rows } = await pool.query(sql, args);
    res.json({ success: true, data: rows, total: rows.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// ── URL DEL LOGO ──
router.get('/logo/url', (req, res) => {
  try {
    if (useCloudinary) {
      const url = cloudinary.url('snackemi/logo/logo_emi', { fetch_format: 'auto', quality: 'auto' });
      return res.json({ success: true, url });
    }
    const logoDir = path.join(__dirname, '../public/img/logo');
    const files   = fs.existsSync(logoDir) ? fs.readdirSync(logoDir).filter(f => f.startsWith('logo_emi')) : [];
    const url     = files.length ? '/img/logo/' + files[0] : null;
    res.json({ success: !!url, url });
  } catch {
    res.json({ success: false, url: null });
  }
});

// ── URL DEL QR ──
router.get('/qr/url', (req, res) => {
  try {
    if (useCloudinary) {
      const url = cloudinary.url('snackemi/qr/qr_pago', { fetch_format: 'auto', quality: 'auto' });
      return res.json({ success: true, url });
    }
    const qrDir = path.join(__dirname, '../public/img/qr');
    const files = fs.existsSync(qrDir) ? fs.readdirSync(qrDir).filter(f => f.startsWith('qr_pago')) : [];
    const url   = files.length ? '/img/qr/' + files[0] : null;
    res.json({ success: !!url, url });
  } catch {
    res.json({ success: false, url: null });
  }
});

// ── SUBIR LOGO ──
router.post('/logo/upload', requireAdmin, uploadLogo.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  const url = fileUrl(req.file, 'logo');
  res.json({ success: true, url, mensaje: 'Logo EMI actualizado' });
});

// ── SUBIR QR ──
router.post('/qr/upload', requireAdmin, uploadQR.single('qr'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  const url = fileUrl(req.file, 'qr');
  res.json({ success: true, url, mensaje: 'QR de pago actualizado' });
});

// ── DETALLE POR ID ──
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.nombre AS categoria, c.icono
       FROM productos p
       INNER JOIN categorias c ON p.categoria_id = c.categoria_id
       WHERE p.producto_id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ success: true, data: rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ── CREAR ──
router.post('/', requireAdmin, uploadProducto.single('imagen'), async (req, res) => {
  const { nombre, descripcion, precio, stock, minStock, categoriaId, estado, destacado } = req.body;
  const imagenRuta = req.file ? fileUrl(req.file, 'prod') : null;
  if (!nombre || !precio || !categoriaId)
    return res.status(400).json({ error: 'Nombre, precio y categoría son requeridos' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO productos (nombre, descripcion, precio, stock_actual, stock_minimo,
                              categoria_id, imagen_ruta, estado, destacado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING producto_id`,
      [nombre, descripcion||'', parseFloat(precio), parseInt(stock)||0,
       parseInt(minStock)||5, parseInt(categoriaId), imagenRuta,
       estado||'activo', destacado==='true']
    );
    res.status(201).json({ success: true, id: rows[0].producto_id, imagen: imagenRuta });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// ── EDITAR ──
router.put('/:id', requireAdmin, uploadProducto.single('imagen'), async (req, res) => {
  const { nombre, descripcion, precio, stock, minStock, categoriaId, estado, destacado } = req.body;
  const id     = parseInt(req.params.id);
  const campos = [];
  const args   = [];
  const set    = (col, val) => { args.push(val); campos.push(`${col} = $${args.length}`); };

  if (nombre)                    set('nombre', nombre);
  if (descripcion !== undefined) set('descripcion', descripcion);
  if (precio)                    set('precio', parseFloat(precio));
  if (stock !== undefined)       set('stock_actual', parseInt(stock));
  if (minStock)                  set('stock_minimo', parseInt(minStock));
  if (categoriaId)               set('categoria_id', parseInt(categoriaId));
  if (estado)                    set('estado', estado);
  if (destacado !== undefined)   set('destacado', destacado === 'true');

  if (req.file) {
    const old = await pool.query('SELECT imagen_ruta FROM productos WHERE producto_id=$1', [id]);
    deleteOldImage(old.rows[0]?.imagen_ruta);
    set('imagen_ruta', fileUrl(req.file, 'prod'));
  }

  set('fecha_actualizacion', new Date());
  args.push(id);
  if (campos.length === 1) return res.status(400).json({ error: 'Nada que actualizar' });

  try {
    const result = await pool.query(
      `UPDATE productos SET ${campos.join(', ')} WHERE producto_id = $${args.length}`,
      args
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ success: true, message: 'Producto actualizado', imagen: req.file ? fileUrl(req.file, 'prod') : null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

// ── ELIMINAR ──
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const dep = await pool.query(
      'SELECT 1 FROM detalle_pedidos WHERE producto_id = $1 LIMIT 1', [id]
    );
    if (dep.rows.length > 0) {
      await pool.query("UPDATE productos SET estado='inactivo' WHERE producto_id=$1", [id]);
      return res.json({ success: true, message: 'Producto desactivado' });
    }
    const prod = await pool.query('SELECT imagen_ruta FROM productos WHERE producto_id=$1', [id]);
    deleteOldImage(prod.rows[0]?.imagen_ruta);
    await pool.query('DELETE FROM productos WHERE producto_id = $1', [id]);
    res.json({ success: true, message: 'Producto eliminado' });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
});

module.exports = router;
