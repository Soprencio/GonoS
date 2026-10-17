const { Router } = require('express');
const { callSp } = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

const router = Router();

async function getParticipacion(usuarioId, claseId) {
  const rows = await callSp('sp_obtener_participacion', [usuarioId, claseId]);
  return rows[0] || null;
}

// GET /api/clases/:claseId/publicaciones — listar publicaciones
router.get('/clases/:claseId/publicaciones', requireAuth, async (req, res) => {
  try {
    const participacion = await getParticipacion(req.user.id, req.params.claseId);
    if (!participacion) {
      return res.status(403).json({ error: 'No tenés acceso a esta clase' });
    }

    const rows = await callSp('sp_listar_publicaciones_clase', [req.params.claseId]);

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

    const rows = await callSp('sp_crear_publicacion_clase', [
      req.params.claseId,
      participacion.participacion_id,
      mensajeSaneado
    ]);

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
