const { Router } = require('express');
const pool = require('../database/connection');
const { requireAuth } = require('../middleware/auth');
const { sanitizeText } = require('../utils/sanitize');

const router = Router();

// ── Helpers ──

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

async function getEntregaClaseId(entregaId) {
  const [rows] = await pool.execute(
    `SELECT e.entrega_id, a.participacion_id, t.clase_id
     FROM entrega e
     JOIN asignacion a ON e.asignacion_id = a.asignacion_id
     JOIN trabajos t ON a.tp_id = t.tp_id
     WHERE e.entrega_id = ?`,
    [entregaId]
  );
  return rows[0] || null;
}

const ESTADOS_VALIDOS = ['Pendiente', 'En revisión', 'Revisado', 'Aprobado'];

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
    if (!participacion || participacion.rol !== 'Profesor') {
      return res.status(403).json({ error: 'Solo el profesor puede comentar en esta entrega' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const ahora = new Date();
      const [comResult] = await conn.execute(
        'INSERT INTO comentario_priv (entrega_id, participacion_id, comentario, fecha) VALUES (?, ?, ?, ?)',
        [req.params.entregaId, participacion.participacion_id, textoSaneado, ahora]
      );

      if (posicion) {
        await conn.execute(
          'INSERT INTO posiciones (com_priv_id, teje_id, valor) VALUES (?, 1, ?), (?, 2, ?), (?, 3, ?)',
          [comResult.insertId, posicion.x, comResult.insertId, posicion.y, comResult.insertId, posicion.z]
        );
      }

      await conn.commit();

      const respuesta = {
        com_priv_id: comResult.insertId,
        comentario: textoSaneado,
        fecha: ahora,
        posicion: posicion ? { x: posicion.x, y: posicion.y, z: posicion.z } : null
      };

      res.status(201).json(respuesta);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
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

    const [comentarios] = await pool.execute(
      `SELECT c.com_priv_id, c.comentario, c.fecha,
              p.posicion_x, p.posicion_y, p.posicion_z,
              u.nombre AS profe_nombre, u.apellido AS profe_apellido
       FROM comentario_priv c
       LEFT JOIN (
         SELECT com_priv_id,
           MAX(CASE WHEN teje_id = 1 THEN valor END) AS posicion_x,
           MAX(CASE WHEN teje_id = 2 THEN valor END) AS posicion_y,
           MAX(CASE WHEN teje_id = 3 THEN valor END) AS posicion_z
         FROM posiciones
         GROUP BY com_priv_id
       ) p ON c.com_priv_id = p.com_priv_id
       JOIN participaciones pp ON c.participacion_id = pp.participacion_id
       JOIN usuarios u ON pp.usuario_id = u.usuario_id
       WHERE c.entrega_id = ?
       ORDER BY c.fecha ASC`,
      [req.params.entregaId]
    );

    const result = comentarios.map(c => ({
      com_priv_id: c.com_priv_id,
      comentario: c.comentario,
      fecha: c.fecha,
      posicion: c.posicion_x != null
        ? { x: c.posicion_x, y: c.posicion_y, z: c.posicion_z }
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
    const [comentarios] = await pool.execute(
      `SELECT c.com_priv_id, c.participacion_id, e.entrega_id,
              a.participacion_id AS alumno_participacion_id, t.clase_id
       FROM comentario_priv c
       JOIN entrega e ON c.entrega_id = e.entrega_id
       JOIN asignacion a ON e.asignacion_id = a.asignacion_id
       JOIN trabajos t ON a.tp_id = t.tp_id
       WHERE c.com_priv_id = ?`,
      [req.params.id]
    );

    if (comentarios.length === 0) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    const com = comentarios[0];
    const participacion = await getParticipacion(req.user.id, com.clase_id);

    if (!participacion || participacion.rol !== 'Profesor') {
      return res.status(403).json({ error: 'Solo el profesor puede eliminar comentarios' });
    }

    // Las posiciones se borran por CASCADE
    await pool.execute('DELETE FROM comentario_priv WHERE com_priv_id = ?', [req.params.id]);

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
    const [entregas] = await pool.execute(
      `SELECT e.entrega_id, e.asignacion_id, t.clase_id
       FROM entrega e
       JOIN asignacion a ON e.asignacion_id = a.asignacion_id
       JOIN trabajos t ON a.tp_id = t.tp_id
       WHERE e.entrega_id = ?`,
      [req.params.id]
    );

    if (entregas.length === 0) {
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }

    const participacion = await getParticipacion(req.user.id, entregas[0].clase_id);
    if (!participacion || participacion.rol !== 'Profesor') {
      return res.status(403).json({ error: 'Solo el profesor puede cambiar el estado de una entrega' });
    }

    await pool.execute(
      'UPDATE asignacion SET estado = ? WHERE asignacion_id = ?',
      [estado, entregas[0].asignacion_id]
    );

    res.json({ mensaje: 'Estado actualizado', estado });
  } catch (err) {
    console.error('Error al actualizar estado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
