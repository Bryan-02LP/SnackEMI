// ════════════════════════════════════════════════════════════
// cloudinary.js — Configuración de Cloudinary
// ════════════════════════════════════════════════════════════

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configurar con las credenciales del .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage para productos
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'snackemi/productos',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 600, height: 450, crop: 'fill', quality: 'auto' }],
  },
});

// Storage para el logo EMI
const logoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'snackemi/logo',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    public_id:      'logo_emi',        // siempre sobreescribe el mismo archivo
    overwrite:      true,
    transformation: [{ width: 200, height: 200, crop: 'fit', quality: 'auto' }],
  },
});

const uploadProducto = multer({
  storage: productStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
});

const uploadLogo = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
});

module.exports = { cloudinary, uploadProducto, uploadLogo };
