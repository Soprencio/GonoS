const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE, 10) || 50 * 1024 * 1024; // 50MB default

const ALLOWED_EXTENSIONS = [
  '.obj', '.stl', '.gltf', '.glb', '.ifc', '.fbx', '.svg',
  '.jpg', '.jpeg', '.png', '.pdf'
];

const storage = multer.diskStorage({
  destination: path.join(UPLOAD_DIR, 'original'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error(`Formato no permitido: ${ext}`), { multerCode: 'BAD_EXTENSION' }));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

async function deleteFileIfExists(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('Error al eliminar archivo:', err);
    }
  }
}

module.exports = { upload, deleteFileIfExists, UPLOAD_DIR, MAX_FILE_SIZE };
