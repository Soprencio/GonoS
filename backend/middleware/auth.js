const { verifyToken } = require('../utils/jwt');
const pool = require('../database/connection');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const token = header.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  req.user = { id: decoded.id, mail: decoded.mail };

  try {
    const [rows] = await pool.execute('SELECT activo FROM usuarios WHERE usuario_id = ?', [req.user.id]);
    if (rows.length === 0 || !rows[0].activo) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contactá al administrador' });
    }
    next();
  } catch {
    next();
  }
}

module.exports = { requireAuth };
