require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const requiredEnv = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_NAME', 'DB_PORT'];
const missing = requiredEnv.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`Error crítico: faltan variables de entorno obligatorias: ${missing.join(', ')}`);
  process.exit(1);
}

const authRoutes = require('./routes/auth.routes');
const clasesRoutes = require('./routes/clases.routes');
const trabajosRoutes = require('./routes/trabajos.routes');
const entregasRoutes = require('./routes/entregas.routes');
const comentariosRoutes = require('./routes/comentarios.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4000'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/clases', clasesRoutes);
app.use('/api', trabajosRoutes);
app.use('/api', entregasRoutes);
app.use('/api', comentariosRoutes);

// Error handler específico de Multer (debe ir antes del 500 genérico)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `Archivo demasiado grande (máx ${Math.round(require('./middleware/upload').MAX_FILE_SIZE / 1024 / 1024)}MB)` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.multerCode === 'BAD_EXTENSION') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

// En producción, servir el frontend compilado (monolith deployment)
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
