const { Router } = require('express');
const pool = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

const router = Router();

async function getParticipacion(usuarioId, claseId) {
  const [rows] = await pool.execute(
    `SELECT p.participacion_id, r.nombre AS rol
     FROM participaciones p
     JOIN roles r ON p.rol_id = r.rol_id
     WHERE p.usuario_id = ? AND p.clase_id = ?`,
    [usuarioId, claseId]
  );
  return rows[0] || null;
}

// GET /api/clases/:claseId/publicaciones — listar publicaciones
router.get('/clases/:claseId/publicaciones', requireAuth, async (req, res) => {
  try {
    const participacion = await getParticipacion(req.user.id, req.params.claseId);
    if (!participacion) {
      return res.status(403).json({ error: 'No tenés acceso a esta clase' });
    }

    const [rows] = await pool.execute(
      `SELECT p.publicacion_id, p.mensaje, p.created_at,
              u.nombre AS profe_nombre, u.apellido AS profe_apellido
       FROM publicaciones p
       JOIN participaciones pp ON p.participacion_id = pp.participacion_id
       JOIN usuarios u ON pp.usuario_id = u.usuario_id
       WHERE p.clase_id = ?
       ORDER BY p.created_at DESC`,
      [req.params.claseId]
    );

    res.json(rows.map(r => ({
      publicacion_id: r.publicacion_id,
      mensaje: r.mensaje,
      created_at: r.created_at,
      profesor: `${r.profe_nombre} ${r.profe_apellido}`
    })));
  } catch (err) {
    console.error('Error al listar publicaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/clases/:claseId/publicaciones — crear publicación (solo Profesor/Creador)
router.post('/clases/:claseId/publicaciones', requireAuth, async (req, res) => {
  const { mensaje } = req.body;

  if (!mensaje || typeof mensaje !== 'string' || !mensaje.trim()) {
    return res.status(400).json({ error: 'El mensaje es obligatorio' });
  }

  const mensajeSaneado = sanitizeText(mensaje.trim());
  if (mensajeSaneado.length > 5000) {
    return res.status(400).json({ error: 'El mensaje no puede superar los 5000 caracteres' });
  }

  try {
    const participacion = await getParticipacion(req.user.id, req.params.claseId);
    if (!participacion || (participacion.rol !== 'Profesor' && participacion.rol !== 'Creador')) {
      return res.status(403).json({ error: 'Solo el profesor puede publicar en esta clase' });
    }

    const [result] = await pool.execute(
      'INSERT INTO publicaciones (clase_id, participacion_id, mensaje) VALUES (?, ?, ?)',
      [req.params.claseId, participacion.participacion_id, mensajeSaneado]
    );

    const [rows] = await pool.execute(
      `SELECT p.publicacion_id, p.mensaje, p.created_at,
              u.nombre AS profe_nombre, u.apellido AS profe_apellido
       FROM publicaciones p
       JOIN participaciones pp ON p.participacion_id = pp.participacion_id
       JOIN usuarios u ON pp.usuario_id = u.usuario_id
       WHERE p.publicacion_id = ?`,
      [result.insertId]
    );

    const pub = rows[0];
    res.status(201).json({
      publicacion_id: pub.publicacion_id,
      mensaje: pub.mensaje,
      created_at: pub.created_at,
      profesor: `${pub.profe_nombre} ${pub.profe_apellido}`
    });
  } catch (err) {
    console.error('Error al crear publicación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
