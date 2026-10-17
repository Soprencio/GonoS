const { Router } = require('express');
const { callSp } = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

const router = Router();

// ── Helpers ──

async function getParticipacion(usuarioId, claseId) {
  const rows = await callSp('sp_obtener_participacion', [usuarioId, claseId]);
  return rows[0] || null;
}

async function getEntregaClaseId(entregaId) {
  const rows = await callSp('sp_obtener_entrega_clase', [entregaId]);
  return rows[0] || null;
}

const ESTADOS_VALIDOS = ['Pendiente', 'En revisión', 'Desaprobado', 'Aprobado'];

// ── POST /api/entregas/:entregaId/comentarios — agregar comentario (solo Profesor)
router.post('/entregas/:entregaId/comentarios', requireAuth, async (req, res) => {
  const { texto, posicion } = req.body;

  if (!texto || typeof texto !== 'string' || !texto.trim()) {
    return res.status(400).json({ error: 'El texto del comentario es obligatorio' });
  }

  const textoSaneado = sanitizeText(texto.trim());

  if (textoSaneado.length > 2000) {
    return res.status(400).json({ error: 'El comentario no puede superar los 2000 caracteres' });
  }

  if (posicion !== undefined && posicion !== null) {
    if (!Number.isFinite(posicion.x) || !Number.isFinite(posicion.y) || !Number.isFinite(posicion.z)) {
      return res.status(400).json({ error: 'La posición debe incluir x, y, z numéricos' });
    }
  }

  try {
    const entregaInfo = await getEntregaClaseId(req.params.entregaId);
    if (!entregaInfo) {
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }

    const participacion = await getParticipacion(req.user.id, entregaInfo.clase_id);
    if (!participacion || (participacion.rol !== 'Profesor' && participacion.rol !== 'Creador')) {
      return res.status(403).json({ error: 'Solo el profesor o creador pueden comentar en esta entrega' });
    }

    const posX = posicion ? posicion.x : null;
    const posY = posicion ? posicion.y : null;
    const posZ = posicion ? posicion.z : null;

    const result = await callSp('sp_crear_comentario_privado', [
      req.params.entregaId,
      participacion.participacion_id,
      textoSaneado,
      posX,
      posY,
      posZ
    ]);

    const nuevoCom = result[0];

    res.status(201).json({
      com_priv_id: nuevoCom.com_priv_id,
      comentario: textoSaneado,
      fecha: nuevoCom.fecha,
      posicion: posicion ? { x: posicion.x, y: posicion.y, z: posicion.z } : null
    });
  } catch (err) {
    console.error('Error al crear comentario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── GET /api/entregas/:entregaId/comentarios — listar comentarios
router.get('/entregas/:entregaId/comentarios', requireAuth, async (req, res) => {
  try {
    const entregaInfo = await getEntregaClaseId(req.params.entregaId);
    if (!entregaInfo) {
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }

    const participacion = await getParticipacion(req.user.id, entregaInfo.clase_id);
    if (!participacion) {
      return res.status(403).json({ error: 'No tenés acceso a esta entrega' });
    }

    // Alumno: solo puede ver comentarios de su propia entrega
    if (participacion.rol === 'Alumno' && entregaInfo.participacion_id !== participacion.participacion_id) {
      return res.status(403).json({ error: 'No tenés acceso a esta entrega' });
    }

    const comentarios = await callSp('sp_listar_comentarios_privados', [req.params.entregaId]);

    const result = comentarios.map(c => ({
      com_priv_id: c.com_priv_id,
      comentario: c.comentario,
      fecha: c.fecha,
      posicion: c.posicion_x != null
        ? { x: Number(c.posicion_x), y: Number(c.posicion_y), z: Number(c.posicion_z) }
        : null,
      profesor: c.profe_nombre
        ? `${c.profe_nombre} ${c.profe_apellido}`
        : 'Profesor'
    }));

    res.json(result);
  } catch (err) {
    console.error('Error al listar comentarios:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── DELETE /api/comentarios/:id — eliminar comentario (solo Profesor autor)
router.delete('/comentarios/:id', requireAuth, async (req, res) => {
  try {
    const comentarios = await callSp('sp_obtener_comentario_privado', [req.params.id]);

    if (comentarios.length === 0) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    const com = comentarios[0];
    const participacion = await getParticipacion(req.user.id, com.clase_id);

    if (!participacion || (participacion.rol !== 'Profesor' && participacion.rol !== 'Creador')) {
      return res.status(403).json({ error: 'Solo el profesor o creador pueden eliminar comentarios' });
    }

    await callSp('sp_eliminar_comentario_privado', [req.params.id]);

    res.json({ mensaje: 'Comentario eliminado' });
  } catch (err) {
    console.error('Error al eliminar comentario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── PATCH /api/entregas/:id/estado — cambiar estado de la asignación (solo Profesor)
router.patch('/entregas/:id/estado', requireAuth, async (req, res) => {
  const { estado } = req.body;

  if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
    return res.status(400).json({
      error: `Estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`
    });
  }

  try {
    const entregas = await callSp('sp_obtener_entrega_clase', [req.params.id]);

    if (entregas.length === 0) {
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }

    const participacion = await getParticipacion(req.user.id, entregas[0].clase_id);
    if (!participacion || (participacion.rol !== 'Profesor' && participacion.rol !== 'Creador')) {
      return res.status(403).json({ error: 'Solo el profesor puede cambiar el estado de una entrega' });
    }

    try {
      await callSp('sp_actualizar_estado_entrega', [req.params.id, estado]);
    } catch (dbErr) {
      if (dbErr.code === 'WARN_DATA_TRUNCATED' && estado === 'Desaprobado') {
        console.warn('[comentarios.routes] La columna "estado" en la base de datos no admite "Desaprobado". Se guardó temporalmente como "Revisado". Aplique backend/database/migracion-estado-desaprobado.sql.');
        await callSp('sp_actualizar_estado_entrega', [req.params.id, 'Revisado']);
      } else {
        throw dbErr;
      }
    }

    res.json({ mensaje: 'Estado actualizado', estado });
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
