const { Router } = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { callSp } = require('../database/connection');
const { createToken } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

const router = Router();

// ── Rate limiting simple en memoria ──
const loginAttempts = new Map();

function getLoginAttempts(ip) {
  const entry = loginAttempts.get(ip);
  if (!entry) return { count: 0, blockedUntil: null };
  if (entry.blockedUntil && Date.now() > entry.blockedUntil) {
    loginAttempts.delete(ip);
    return { count: 0, blockedUntil: null };
  }
  return entry;
}

function recordFailedAttempt(ip) {
  const entry = getLoginAttempts(ip);
  const newCount = entry.count + 1;
  if (newCount >= 5) {
    loginAttempts.set(ip, { count: newCount, blockedUntil: Date.now() + 15 * 60 * 1000 });
  } else {
    loginAttempts.set(ip, { count: newCount, blockedUntil: null });
  }
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

// ── Helpers ──
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitize(str) {
  return str.trim().substring(0, 100);
}

// ── GET /api/auth/google-config ──
// Expone públicamente el Client ID de Google para que el frontend inicialice el botón GIS
router.get('/google-config', (req, res) => {
  res.json({
    clientId: process.env.GOOGLE_CLIENT_ID || ''
  });
});

// ── Caché en memoria de fotos de perfil de Google ──
const userPictures = new Map();

// ── POST /api/auth/google ──
// Valida el token de Google Identity Services y registra/loguea al usuario automáticamente
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Token de Google no proporcionado' });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return res.status(503).json({
        error: 'El inicio de sesión con Google no está configurado en el servidor (falta GOOGLE_CLIENT_ID)'
      });
    }

    // Verificar el ID Token directamente contra el servidor oficial de Google OAuth2
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
    const googleRes = await fetch(verifyUrl);

    if (!googleRes.ok) {
      return res.status(401).json({ error: 'Token de Google inválido o expirado' });
    }

    const payload = await googleRes.json();

    // Validar que el token haya sido emitido específicamente para nuestro Client ID
    if (payload.aud !== googleClientId) {
      return res.status(401).json({ error: 'El token de Google no pertenece a esta aplicación' });
    }

    // Validar emisor oficial de Google
    if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
      return res.status(401).json({ error: 'Emisor de token no válido' });
    }

    // Validar que el correo sea real y esté verificado por Google
    const isVerified = payload.email_verified === 'true' || payload.email_verified === true;
    if (!payload.email || !isVerified) {
      return res.status(400).json({ error: 'Tu cuenta de Google no tiene un correo verificado' });
    }

    const mail = payload.email.trim().toLowerCase();
    const rawNombre = payload.given_name || payload.name || mail.split('@')[0];
    const rawApellido = payload.family_name || '-';
    const picture = typeof payload.picture === 'string' && payload.picture.startsWith('https://')
      ? payload.picture
      : null;

    const nombre = sanitizeText(sanitize(rawNombre)) || 'Usuario';
    const apellido = sanitizeText(sanitize(rawApellido)) || '-';

    // Buscar si el usuario ya existe mediante Stored Procedure
    const existingRows = await callSp('sp_usuario_por_mail', [mail]);
    let user = existingRows[0];

    if (user) {
      if (!user.activo) {
        return res.status(403).json({ error: 'Cuenta desactivada. Contactá al administrador' });
      }
    } else {
      // Primer ingreso con Google: crear cuenta automáticamente con hash aleatorio seguro
      const randomSecret = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
      const password_hash = await bcrypt.hash(randomSecret, 10);

      const createResult = await callSp('sp_crear_usuario', [mail, password_hash, nombre, apellido]);
      const nuevoUsuarioId = createResult[0].usuario_id;

      user = {
        usuario_id: nuevoUsuarioId,
        mail,
        nombre,
        apellido
      };
    }

    if (picture) {
      userPictures.set(user.usuario_id, picture);
    }

    const token = createToken({ id: user.usuario_id, mail: user.mail });

    res.json({
      token,
      user: {
        id: user.usuario_id,
        mail: user.mail,
        nombre: user.nombre,
        apellido: user.apellido,
        picture: picture || userPictures.get(user.usuario_id) || null
      }
    });
  } catch (err) {
    console.error('Error en autenticación con Google:', err);
    res.status(500).json({ error: 'Error interno al autenticar con Google' });
  }
});

// ── POST /api/auth/register ──
router.post('/register', async (req, res) => {
  try {
    let { mail, password, nombre, apellido } = req.body;

    if (!mail || !password || !nombre || !apellido) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    mail = mail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(mail)) {
      return res.status(400).json({ error: 'Formato de mail inválido' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    nombre = sanitizeText(sanitize(nombre));
    apellido = sanitizeText(sanitize(apellido));
    if (!nombre || !apellido) {
      return res.status(400).json({ error: 'Nombre y apellido son obligatorios' });
    }

    const existing = await callSp('sp_usuario_por_mail', [mail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Este mail ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await callSp('sp_crear_usuario', [mail, password_hash, nombre, apellido]);
    const nuevoUsuarioId = result[0].usuario_id;

    const token = createToken({ id: nuevoUsuarioId, mail });

    res.status(201).json({
      token,
      user: { id: nuevoUsuarioId, mail, nombre, apellido }
    });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── POST /api/auth/login ──
router.post('/login', async (req, res) => {
  try {
    const ip = req.ip;
    const attempts = getLoginAttempts(ip);
    if (attempts.blockedUntil) {
      const remaining = Math.ceil((attempts.blockedUntil - Date.now()) / 1000 / 60);
      return res.status(429).json({ error: `Demasiados intentos. Intentá de nuevo en ${remaining} minutos` });
    }

    const { mail, password } = req.body;
    if (!mail || !password) {
      return res.status(400).json({ error: 'Mail y contraseña son obligatorios' });
    }

    const rows = await callSp('sp_usuario_por_mail', [mail.trim().toLowerCase()]);

    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      recordFailedAttempt(ip);
      return res.status(401).json({ error: 'Mail o contraseña incorrectos' });
    }

    if (!user.activo) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contactá al administrador' });
    }

    clearLoginAttempts(ip);
    const token = createToken({ id: user.usuario_id, mail: user.mail });

    res.json({
      token,
      user: { id: user.usuario_id, mail: user.mail, nombre: user.nombre, apellido: user.apellido }
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/auth/me ──
router.get('/me', requireAuth, async (req, res) => {
  try {
    const rows = await callSp('sp_usuario_por_id', [req.user.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const userData = {
      ...rows[0],
      picture: userPictures.get(req.user.id) || null
    };

    res.json(userData);
  } catch (err) {
    console.error('Error en /me:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
