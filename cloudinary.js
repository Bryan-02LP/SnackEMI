// ════════════════════════════════════════════════════════════
// cloudinary.js — Imágenes: Cloudinary (prod) o disco local (dev)
// ════════════════════════════════════════════════════════════

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const useCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY   &&
  process.env.CLOUDINARY_API_SECRET
);

// Crea carpeta si no existe
function mkdirp(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Convierte la ruta absoluta del archivo a URL web (/img/prod/...)
function fileUrl(reqFile, subfolder) {
  if (!reqFile) return null;
  if (useCloudinary) return reqFile.path; // Cloudinary ya devuelve la URL
  return `/img/${subfolder}/${path.basename(reqFile.path)}`;
}

let cloudinary      = null;
let uploadProducto;
let uploadLogo;
let uploadQR;

if (useCloudinary) {
  const cloudinaryLib       = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinaryLib.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  cloudinary = cloudinaryLib;

  uploadProducto = multer({
    storage: new CloudinaryStorage({
      cloudinary,
      params: {
        folder:          'snackemi/productos',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        transformation:  [{ width: 600, height: 450, crop: 'fill', quality: 'auto' }],
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
  });

  uploadLogo = multer({
    storage: new CloudinaryStorage({
      cloudinary,
      params: {
        folder:          'snackemi/logo',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        public_id:       () => 'logo_emi',
        overwrite:       true,
        transformation:  [{ width: 200, height: 200, crop: 'fit', quality: 'auto' }],
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
  });

  uploadQR = multer({
    storage: new CloudinaryStorage({
      cloudinary,
      params: {
        folder:          'snackemi/qr',
        allowed_formats: ['jpg', 'jpeg', 'png'],
        public_id:       () => 'qr_pago',
        overwrite:       true,
        transformation:  [{ width: 400, height: 400, crop: 'fit', quality: 'auto' }],
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
  });

} else {
  // ── MODO LOCAL ──
  const prodDir = path.join(__dirname, 'public/img/prod');
  const logoDir = path.join(__dirname, 'public/img/logo');
  const qrDir   = path.join(__dirname, 'public/img/qr');
  mkdirp(prodDir);
  mkdirp(logoDir);
  mkdirp(qrDir);

  uploadProducto = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, prodDir),
      filename:    (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        cb(null, `prod_${Date.now()}${ext}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
  });

  uploadLogo = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, logoDir),
      filename:    (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        cb(null, `logo_emi${ext}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
  });

  uploadQR = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, qrDir),
      filename:    (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        cb(null, `qr_pago${ext}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
  });
}

module.exports = { cloudinary, uploadProducto, uploadLogo, uploadQR, useCloudinary, fileUrl };
