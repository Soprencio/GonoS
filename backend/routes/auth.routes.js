const { Router } = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../database/connection');
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

    const [existing] = await pool.execute('SELECT usuario_id FROM usuarios WHERE mail = ?', [mail]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Este mail ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO usuarios (mail, password_hash, nombre, apellido) VALUES (?, ?, ?, ?)',
      [mail, password_hash, nombre, apellido]
    );

    const token = createToken({ id: result.insertId, mail });

    res.status(201).json({
      token,
      user: { id: result.insertId, mail, nombre, apellido }
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

    const [rows] = await pool.execute(
      'SELECT usuario_id, mail, password_hash, nombre, apellido, activo FROM usuarios WHERE mail = ?',
      [mail.trim().toLowerCase()]
    );

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
    const [rows] = await pool.execute(
      'SELECT usuario_id, mail, nombre, apellido FROM usuarios WHERE usuario_id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error en /me:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
